/**
 * View, create and edit regions on Google Maps.
 *
 * @name map.js
 * @fileOverview A simple way to use Google Maps.
 * @version 0.1.0b
 * @author Komoo Team
 * @copyright (c) 2012 it3s
 */

// TODO: Get from Django the static url to avoid hardcode some urls.
// TODO: Create a generic function to attach events to open/close info window.

/** @namespace */
if (!window.komoo) komoo = {};
if (!komoo.event) komoo.event = google.maps.event;


komoo.CLEAN_MAPTYPE_ID = "clean";


/**
 * @name komoo.FeatureType
 * @class Object that represents a item on Add tab of main panel.
 * @property {String} type An internal identifier.
 * @property {String[]} categories
 * @property {String} title The text displayed to user as a menu item.
 * @property {String} tooltip The text displayed on mouse over.
 * @property {String} color
 * @property {String} icon The icon url.
 * @property {google.maps.drawing.OverlayType[]} overlayTypes The geometry options displayed as submenu.
 * @property {String} formUrl The url used to load the form via ajax.
 *           This occurs when user click on Finish button.
 *           Please use dutils.urls.resolve instead of hardcode the address.
 * @property {boolean} disabled
 */

komoo.OverlayType = {
    POINT: 'Point',
    MULTIPOINT: 'MultiPoint',
    POLYGON: 'Polygon',
    POLYLINE: 'LineString',
};


/**
 * Options object to {@link komoo.Map}.
 *
 * @class
 * @property {boolen} [editable=true]  Define if the drawing feature will be enabled.
 * @property {boolean} [useGeoLocation=false] Define if the HTML5 GeoLocation will be used to set the initial location.
 * @property {boolean} [defaultDrawingControl=false] If true the controls from Google Drawing library are used.
 * @property {komoo.FeatureType[]} [featureTypes=komoo.FeatureTypes]
 * @property {boolean} [autoSaveLocation=false] Determines if the current location is saved to be displayed the next time the map is loaded.
 * @property {boolean} [enableInfoWindow=true] Shows informations on mouse over.
 * @property {boolean} [enableCluster=false] Cluster some points together.
 * @property {boolean} [debug=false]
 * @property {Object} [overlayOptions]
 * @property {google.maps.MapOptions} [googleMapOptions] The Google Maps map options.
 */
komoo.MapOptions = {
    clustererMaxZoom: 10,
    polygonIconsMinZoom: 17,
    fetchUrl: "/get_geojson?",
    editable: true,
    useGeoLocation: false,
    defaultDrawingControl: false,
    featureTypes: [],
    autoSaveLocation: false,
    autoSaveMapType: false,
    enableInfoWindow: true,
    displayClosePanel: false,
    displaySupporter: false,
    enableCluster: true,
    fetchOverlays: true,
    debug: false,
    overlayOptions: {
        visible: true,
        fillColor: "#ff0",
        fillOpacity: 0.70,
        strokeColor: "#ff0",
        strokeWeight: 3,
        strokeOpacity: 0.70
    },
    googleMapOptions: {  // Our default options for Google Maps map object.
        center: new google.maps.LatLng(-23.55, -46.65),  // São Paulo, SP - Brasil
        zoom: 13,
        minZoom: 2,
        disableDefaultUI: false,
        mapTypeControlOptions: {
            mapTypeIds: [google.maps.MapTypeId.ROADMAP,
                         komoo.CLEAN_MAPTYPE_ID,
                         google.maps.MapTypeId.HYBRID]
        },
        mapTypeId: komoo.CLEAN_MAPTYPE_ID,
        streetViewControl: false,
        scaleControl: true,
        panControlOptions: {position: google.maps.ControlPosition.RIGHT_TOP},
        zoomControlOptions: {position: google.maps.ControlPosition.RIGHT_TOP},
        scaleControlOptions: {position: google.maps.ControlPosition.RIGHT_BOTTOM,
                              style: google.maps.ScaleControlStyle.DEFAULT}
    }
};




/**
 * @class Object used to get overlays from server for each tile
 *
 * @param {komoo.Map} komooMap
 * @property {komoo.Map} komooMap
 * @property {google.maps.Size} tileSize The tile size. Default: 256x256
 * @property {number} [maxZoom=32]
 * @property {String} name
 * @property {String} alt
 */
komoo.ServerFetchMapType = function (komooMap) {
    this.komooMap = komooMap;
    this.addrLatLngCache = {};
    this.tileSize = new google.maps.Size(256, 256);
    this.maxZoom = 32;
    this.name = "Server Data";
    this.alt  = "Server Data Tile Map Type";
};


komoo.ServerFetchMapType.prototype.releaseTile = function (tile) {
    var serverFetchMapType = this;
    if (this.komooMap.fetchedTiles[tile.tileKey]) {
        var bounds = serverFetchMapType.komooMap.googleMap.getBounds();
        this.komooMap.fetchedTiles[tile.tileKey].overlays.forEach(function (overlay, index, orig) {
            if (overlay.getBounds()) {
                if (!bounds.intersects(overlay.getBounds())) {
                    overlay.setMap(null);
                } else if (!bounds.contains(overlay.getBounds().getNorthEast()) ||
                        !bounds.contains(overlay.getBounds().getSouthWest())){
                    serverFetchMapType.komooMap.keptOverlays.push(overlay);
                }
            } else if (overlay.getPosition) {
                if (bounds.contains(overlay.getPosition())) {
                    overlay.setMap(null);
                }
            }
        });
    }
};


komoo.ServerFetchMapType.prototype.getTile = function (coord, zoom, ownerDocument) {
    var me = this;
    var div = ownerDocument.createElement("DIV");
    var addr = this.getAddrLatLng(coord, zoom);
    div.tileKey = addr;
    if (this.komooMap.options.debug) {
        // Display debug info.
        $(div).css({
            "width": this.tileSize.width + "px",
            "height": this.tileSize.height + "px",
            "border": "solid 1px #AAAAAA",
            "overflow": "hidden",
            "font-size": "9px"
        });
    }

    // Verify if we already loaded this block.
    if (this.komooMap.fetchedTiles[addr]) {
        if (this.komooMap.options.debug) {
            // Display debug info.
            div.innerHTML = this.komooMap.fetchedTiles[addr].geojson;
        }
        this.komooMap.fetchedTiles[addr].overlays.forEach(function (overlay, index, orig) {
            overlay.setMap(me.komooMap.googleMap);
            if (overlay.setIcon) {
                overlay.setIcon(overlay.getIconUrl(me.komooMap.googleMap.getZoom()));
            }
            if (overlay.getMarker()) {
                if (zoom < me.komooMap.options.clustererMaxZoom) {
                    //overlay.setMap(null);
                } else {
                    overlay.setMap(me.komooMap.googleMap);
                }
            }
        });
        return div;
    }
    if (this.komooMap.options.fetchOverlays != false) {
        $.ajax({
            url: this.komooMap.options.fetchUrl + addr,
            dataType: "json",
            type: "GET",
            success: function (data, textStatus, jqXHR) {
                var overlays = me.komooMap.loadGeoJSON(JSON.parse(data), false);
                me.komooMap.fetchedTiles[addr] = {
                    geojson: data,
                    overlays: overlays
                };
                if (me.komooMap.options.debug) {
                    // Display debug info.
                    div.innerHTML = data;
                    $(div).css("border", "solid 1px #F00");
                }
                overlays.forEach(function (overlay, index, orig) {
                    overlay.setMap(me.komooMap.googleMap);
                    if (overlay.setIcon) {
                        overlay.setIcon(overlay.getIconUrl(me.komooMap.googleMap.getZoom()));
                    }
                    if (overlay.getMarker()) {
                        // Display polygons as a point depending the zoom level
                        if (zoom < me.komooMap.options.clustererMaxZoom) {
                            //overlay.setMap(null);
                        } else {
                            overlay.setMap(me.komooMap.googleMap);
                        }
                    }
                    if (overlay.getPaths) {
                        /*
                        // Brings small polygons to front
                        var zIndex = overlay.zIndex;
                        overlays.forEach(function (overlayToTest, index, orig) {
                            var bounds = overlayToTest.bounds;
                            if (overlay == overlayToTest || !bounds){
                                return;
                            }
                            if (bounds.contains(overlay.bounds.getNorthEast()) || bounds.contains(overlay.bounds.getSouthWest())) {
                                var zIndexToTest = overlayToTest.zIndex;
                                if (zIndexToTest >= zIndex) {
                                    zIndex = zIndexToTest + 1;
                                    overlay.zIndex = zIndex;
                                }
                            };
                        });
                        */
                    }
                });
            },
            error: function (jqXHR, textStatus, errorThrown) {
                if (window.console) console.error(textStatus);
                var serverError = $("#server-error");
                if (serverError.parent().length == 0) {
                    serverError = $("<div>").attr("id", "server-error");
                    $("body").append(serverError);
                    var error = $("<div>").html(jqXHR.responseText)
                    serverError.append(error); // FIXME: This is not user friendly
                }
            }
        });
    }
    return div;
};


/**
 * Converts tile coords to LatLng and returns a url params.
 *
 * @param {google.maps.Point} coord Tile coordinates (x, y).
 * @param {number} zoom Zoom level.
 * @returns {String} The url params to get the data from server.
 */
komoo.ServerFetchMapType.prototype.getAddrLatLng = function (coord, zoom) {
    var key = "x=" + coord.x + ",y=" + coord.y + ",z=" + zoom
    if (this.addrLatLngCache[key]) {
        return this.addrLatLngCache[key];
    }
    var numTiles = 1 << zoom;
    var projection = this.komooMap.googleMap.getProjection();
    var point1 = new google.maps.Point(
            (coord.x + 1) * this.tileSize.width / numTiles,
            coord.y * this.tileSize.width / numTiles);
    var point2 = new google.maps.Point(
            coord.x * this.tileSize.width / numTiles,
            (coord.y + 1) * this.tileSize.width / numTiles);
    var ne = projection.fromPointToLatLng(point1);
    var sw = projection.fromPointToLatLng(point2);
    this.addrLatLngCache[key] = "bounds=" + ne.toUrlValue() + "," + sw.toUrlValue() + "&zoom=" + zoom;
    return this.addrLatLngCache[key];
};



komoo.WikimapiaMapType = function (komooMap) {
    this.komooMap = komooMap;
    this.addrLatLngCache = {};
    this.loadedOverlays = {};
    this.tileSize = new google.maps.Size(256, 256);
    this.maxZoom = 32;
    this.name = "Wikimapia Data";
    this.alt = "Wikimapia Data Tile Map Type";
    this.key = "Add here your wikimapia key";
};

komoo.WikimapiaMapType.prototype.getAddrLatLng = function (coord, zoom) {
    var key = "x=" + coord.x + ",y=" + coord.y
    if (this.addrLatLngCache[key]) {
        return this.addrLatLngCache[key];
    }
    var numTiles = 1 << zoom;
    var projection = this.komooMap.googleMap.getProjection();
    var point1 = new google.maps.Point(
            (coord.x + 1) * this.tileSize.width / numTiles,
            coord.y * this.tileSize.width / numTiles);
    var point2 = new google.maps.Point(
            coord.x * this.tileSize.width / numTiles,
            (coord.y + 1) * this.tileSize.width / numTiles);
    var ne = projection.fromPointToLatLng(point1);
    var sw = projection.fromPointToLatLng(point2);
    this.addrLatLngCache[key] = sw.lng() + "," + sw.lat() + "," + ne.lng() + "," + ne.lat();
    return this.addrLatLngCache[key];
};

komoo.WikimapiaMapType.prototype.getTile = function (coord, zoom, ownerDocument) {
    var me = this;

    function createOverlays(json) {
        var overlays = komoo.collections.makeFeatureCollection({map: me.komooMap});
        var folder = json.folder;
        folder.forEach(function (item, index, orig) {
            var coords = [];
            item.polygon.forEach(function (point, index, orig) {
                coords.push(new google.maps.LatLng(point.y, point.x));
            });
            var polygon = new google.maps.Polygon({paths: [coords], fillColor: 'gray'});
            polygon.wikimapia_id = item.id;
            polygon.wikimapia_name = item.name;
            overlays.push(polygon)
        });
        return overlays;
    }

    var div = ownerDocument.createElement("DIV");
    var addr = this.getAddrLatLng(coord, zoom);
    var url = "http://api.wikimapia.org/?function=box&bbox=" + addr + "&format=json&key=" + this.key;
    div.tileKey = addr;
    //if (this.komooMap.options.debug) {
        // Display debug info.
        $(div).css({
            "width": this.tileSize.width + "px",
            "height": this.tileSize.height + "px",
            "border": "solid 1px #AAAAAA",
            "overflow": "hidden",
            "font-size": "9px"
        });
    //}

    // Verify if we already loaded this block.
    if (this.komooMap.fetchedTiles[addr]) {
        //if (this.komooMap.options.debug) {
            // Display debug info.
            div.innerHTML = JSON.stringify(this.komooMap.fetchedTiles[addr].geojson);
        //}
        return div;
    }
    if (this.komooMap.options.fetchOverlays != false) {
        $.ajax({
            url: url,
            dataType: "json",
            type: "GET",
            success: function (data, textStatus, jqXHR) {
                var overlays = createOverlays(data);
                me.komooMap.fetchedTiles[addr] = {
                    json: data,
                    overlays: overlays
                };
                overlays.forEach(function (overlay, index, orig) {
                    if (!me.loadedOverlays[overlay.wikimapia_id]) {
                        overlay.setMap(me.komooMap.googleMap);
                        me.loadedOverlays[overlay.wikimapia_id] = overlay;
                    }
                });
                //if (me.komooMap.options.debug) {
                    // Display debug info.
                    div.innerHTML = JSON.stringify(data);
                    $(div).css("border", "solid 1px #F00");
                //}
            },
            error: function (jqXHR, textStatus, errorThrown) {
                if (window.console) console.error(textStatus);
            }
        });
    }
    return div;
};

/** @namespace */
komoo.Mode = {};
/***/ komoo.Mode.NAVIGATE = "navigate";
/***/ komoo.Mode.SELECT_CENTER = "select_center";
/***/ komoo.Mode.DRAW = "draw";




/** @namespace */
komoo.EditMode = {};
/***/ komoo.EditMode.NONE = null;
/***/ komoo.EditMode.DRAW = "draw";
/***/ komoo.EditMode.ADD = "add";
/***/ komoo.EditMode.CUTOUT = "cutout";
/***/ komoo.EditMode.DELETE = "delete";




/**
 * Wrapper for Google Maps map object with some helper methods.
 *
 * @class
 * @param {DOM} element The map canvas.
 * @param {komoo.MapOptions} options The options object.
 * @property {undefined | MarkerClusterer} clusterer A MarkerClusterer object used to cluster markers.
 * @property {google.maps.drawing.DrawingManager} drawingManager Drawing manager from Google Maps library.
 * @property {boolean} editable The status of the drawing feature.
 * @property {komoo.EditMode} editMode The current mode of edit feature. Possible values are cutout, add and delete.
 * @property {JQuery} editToolbar JQuery selector of edit toolbar.
 * @property {JQuery} event JQuery selector used to emit events.
 * @property {Object} fetchedTiles Cache the json and the overlays for each tile
 * @property {google.maps.Geocoder} geocoder  Google service to get addresses locations.
 * @property {google.maps.Map} googleMap The Google Maps map object.
 * @property {InfoBox | google.maps.InfoWindow} infoWindow
 * @property {InfoBox | google.maps.InfoWindow} tooltip
 * @property {Object} loadedverlays Cache all overlays
 * @property {komoo.Mode} mode Possible values are null, new, edit
 * @property {google.maps.MVCObject[]} newOverlays Array containing new overlays added by user.
 * @property {komoo.MapOptions} options The options object used to construct the komoo.Map object.
 * @property {Object} overlayOptions
 * @property {google.maps.MVCObject[]} overlays Array containing all overlays.
 * @property {google.maps.Circle} radiusCircle
 * @property {komoo.ServerFetchMapType} serverFetchMapType
 * @property {google.maps.StreetViewPanorama} streetView
 * @property {JQuery} streetViewPanel JQuery selector of Street View panel.
 */
komoo.Map = function (element, options) {
    var komooMap = this;
    // options should be an object.
    if (typeof options !== "object") {
        options = {};
    }
    this.drawingMode = {};
    this.drawingMode[komoo.OverlayType.POINT] = google.maps.drawing.OverlayType.MARKER;
    this.drawingMode[komoo.OverlayType.POLYGON] = google.maps.drawing.OverlayType.POLYGON;
    this.drawingMode[komoo.OverlayType.POLYLINE] = google.maps.drawing.OverlayType.POLYLINE;

    // Join default option with custom options.
    var googleMapOptions = $.extend(komoo.MapOptions.googleMapOptions,
                                    options.googleMapOptions);
    // TODO: init overlay options
    // Initializing some properties.
    this.mode = null;
    this.fetchedTiles = {};
    this.loadedOverlays = {};
    this.options = $.extend(komoo.MapOptions, options);
    this.drawingManagerOptions = {};
    this.overlayOptions = {};
    this.overlays = komoo.collections.makeFeatureCollection({map: this});
    this.keptOverlays = komoo.collections.makeFeatureCollection({map: this});
    this.newOverlays = komoo.collections.makeFeatureCollection({map: this});
    this.loadedOverlays = {};
    this.overlaysByType = {};
    this.initOverlaysByTypeObject();
    // Creates a jquery selector to use the jquery events feature.
    this.event = $("<div>");
    // Creates the Google Maps object.
    this.googleMap = new google.maps.Map(element, googleMapOptions);
    // Uses Tiles to get data from server.
    this.serverFetchMapType = new komoo.ServerFetchMapType(this);
    this.googleMap.overlayMapTypes.insertAt(0, this.serverFetchMapType);
    this.wikimapiaMapType = new komoo.WikimapiaMapType(this);
    //this.googleMap.overlayMapTypes.insertAt(0, this.wikimapiaMapType);
    this.initMarkerClusterer();
    // Create the simple version of toolbar.
    this.editToolbar = $("<div>").addClass("map-toolbar").css("margin", "5px");
    this.initInfoWindow();
    this.setEditable(this.options.editable);
    this.initCustomControl();
    this.initStreetView();
    if (this.options.useGeoLocation) {
        this.goToUserLocation();
    }
    if (this.options.autoSaveMapType) {
        this.useSavedMapType();
    }
    this.handleEvents();
    // Geocoder is used to search locations by name/address.
    this.geocoder = new google.maps.Geocoder();
    if (komoo.onMapReady) {
        komoo.onMapReady(this);
    }

    this.cleanMapType = new google.maps.StyledMapType([
        {
            featureType: "poi",
            elementType: "all",
            stylers: [
                {visibility: "off"}
            ]
        },
        {
            featureType: "road",
            elementType: "all",
            stylers: [
                {lightness: 70}
            ]
        },
        {
            featureType: "transit",
            elementType: "all",
            stylers: [
                {lightness: 50}
            ]
        },
        {
            featureType: "water",
            elementType: "all",
            stylers: [
                {lightness: 50}
            ]
        },
        {
            featureType: "administrative",
            elementType: "labels",
            stylers: [
                {lightness: 30}
            ]
        }
    ], {
        name: gettext("Clean")
    });

    this.googleMap.mapTypes.set(komoo.CLEAN_MAPTYPE_ID, this.cleanMapType);
    this.initEvents();
};

komoo.Map.prototype.initEvents = function (opt_object) {
    var that = this;
    var object = this.googleMap;
    var eventsNames = ['zoom_changed'];
    eventsNames.forEach(function(eventName, index, orig) {
        komoo.event.addListener(object, eventName, function (e, args) {
            if (eventName == 'zoom_changed') e = that.googleMap.getZoom();
            komoo.event.trigger(that, eventName, e, args);
        });
    });
    //this.googleMap.setZoom(this.googleMap.getZoom()); // Fix
};

/**
 * Prepares the infoWindow property. Should not be called externally
 */
komoo.Map.prototype.initInfoWindow = function () {
    var komooMap = this;
    var infoWindowOptions = {
        pixelOffset: new google.maps.Size(0, -20),
        closeBoxMargin: '10px',
        boxStyle: {
            cursor: 'pointer',
            background: 'url(/static/img/infowindow-arrow.png) no-repeat 0 10px', // TODO: Hardcode is evil
            width: '200px'
        }
    };
    this.tooltip = new InfoBox(infoWindowOptions);
    google.maps.event.addDomListener(this.tooltip, "domready", function (e) {
        var closeBox = komooMap.tooltip.div_.firstChild;
        $(closeBox).hide();  // Removes the close button.
        google.maps.event.addDomListener(closeBox, "click", function (e) {
            // Detach the overlay from infowindow when close it.
            komooMap.tooltip.overlay = undefined;
        });
        google.maps.event.addDomListener(komooMap.tooltip.div_, "click", function (e) {
            google.maps.event.trigger(komooMap.tooltip.overlay, "click", {latLng: komooMap.tooltip.getPosition()});
        });
    });


    this.tooltip.title = $("<span>");
    this.tooltip.content = $("<div>").addClass("map-infowindow-content");
    this.tooltip.content.append(this.tooltip.title);

    var css = {
        background: "white",
        padding: "10px",
        margin: "0 0 0 15px"
    };
    this.tooltip.content.css(css);
    this.tooltip.setContent(this.tooltip.content.get(0));

    this.infoWindow = komoo.controls.makeInfoWindow();
};


/**
 * Closes the information window.
 */
komoo.Map.prototype.closeInfoWindow = function () {
    this.infoWindow.close();
};


/**
 * Closes the tooltip.
 */
komoo.Map.prototype.closeTooltip = function () {
    this.tooltip.close();
    this.tooltip.overlay = undefined;
};


/**
 * Display the information window.
 * @param {google.maps.MVCObject} overlay
 * @param {google.maps.LatLng} latLng
 * @param {String} [opt_content]
 */
komoo.Map.prototype.openInfoWindow = function (overlay, latLng, opt_content) {
    if (this.mode) return;
    this.closeTooltip();
    this.infoWindow.open(overlay, latLng, opt_content);
};


/**
 * Display the tooltip.
 * @param {google.maps.MVCObject} overlay
 * @param {google.maps.LatLng} latLng
 * @param {String} [optContent]
 */
komoo.Map.prototype.openTooltip = function (overlay, latLng, optContent) {
    if (overlay == this.infoWindow.feature || this.infoWindow.isMouseover) {
        return;
    }
    if (overlay) {
        this.tooltip.title.text(optContent || overlay.getProperties().name);
        this.tooltip.overlay = overlay;
    }
    if (overlay.getProperties().type == "OrganizationBranch") {
        this.tooltip.title.text(overlay.getProperties().organization_name + " - " + overlay.getProperties().name);
    } else {
        this.tooltip.title.text(overlay.getProperties().name);
    }
    var point = komoo.utils.latLngToPoint(this, latLng);
    point.x += 5;
    var newLatLng = komoo.utils.pointToLatLng(this, point);
    this.tooltip.setPosition(newLatLng);
    this.tooltip.open(this.googleMap);
};


/**
 * Prepares the CustomControl property. Should not be called externally
 */
komoo.Map.prototype.initCustomControl = function () {
    // Draw our custom control.
    if (!this.options.defaultDrawingControl) {
        this.closePanel = this._createClosePanel();
        if (this.options.displayClosePanel) {
            this.closePanel.show();
        }
        this.mainPanel = this._createMainPanel();
        if (!this.editable) {
            this.mainPanel.hide();
        }
        //this.googleMap.controls[google.maps.ControlPosition.TOP_LEFT].push(
        //        this.mainPanel.get(0));
        this.addPanel = this._createAddPanel();
        this.googleMap.controls[google.maps.ControlPosition.TOP_LEFT].push(
                this.addPanel.get(0));
        this.googleMap.controls[google.maps.ControlPosition.TOP_LEFT].push(
                this.closePanel.get(0));
        // Adds editor toolbar.
        //this.googleMap.controls[google.maps.ControlPosition.TOP_LEFT].push(
        //        this.editToolbar.get(0));

        if (this.options.displaySupporter) {
            this.supportersBox = $("<div>");
            this.supportersBox.attr("id", "map-supporters");
            this.googleMap.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(
                    this.supportersBox.get(0));
        }
    }
};


komoo.Map.prototype.setSupportersContent = function (selector) {
    if (this.supportersBox) {
        this.supportersBox.append(selector.show());
    }
};


/**
 * Prepares the markerClusterer property. Should not be called externally.
 */
komoo.Map.prototype.initMarkerClusterer = function () {
    var komooMap = this;
    this.clusterMarkers = [];
    // Adds MarkerClusterer if available.
    if (window.MarkerClusterer && this.options.enableCluster) {
        if (window.console) console.log("Initializing Marker Clusterer support.");
        this.clusterer = new MarkerClusterer(this.googleMap, [], {
            gridSize: 20,
            maxZoom: this.options.clustererMaxZoom,
            minimumClusterSize: 1,
            imagePath: "/static/img/cluster/communities",
            imageSizes: [24, 29, 35, 41, 47]
        });
    }
};


/**
 * Prepares the overlaysByType property. Should not be called externally.
 */
komoo.Map.prototype.initOverlaysByTypeObject = function () {
    // TODO: Refactoring
    var komooMap = this;
    this.options.featureTypes.forEach(function (type, index, orig) {
        var opts = {
            map: komooMap
        };
        komooMap.overlaysByType[type.type] = {categories: type.categories};
        komooMap.overlaysByType[type.type].categories.push("uncategorized");
        komooMap.overlaysByType[type.type].forEach = function (callback) {
            this.categories.forEach(function (item, index, orig) {
                callback(komooMap.overlaysByType[type.type][item], item, orig);
            });   
        };
        komooMap.overlaysByType[type.type]["uncategorized"] = komoo.collections.makeFeatureCollection(opts);
        if (type.categories.length) {
            type.categories.forEach(function(category, index_, orig_) {
                komooMap.overlaysByType[type.type][category] = komoo.collections.makeFeatureCollection(opts);
            });
        }
    });
};


/**
 * Prepares the streetVies property. Should not be called externally.
 */
komoo.Map.prototype.initStreetView = function () {
    if (window.console) console.log("Initializing StreetView support.");
    this.streetViewPanel = $("<div>").addClass("map-panel");
    this.googleMap.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(
            this.streetViewPanel.get(0));
    this.streetViewPanel.hide();
};


komoo.Map.prototype.updateClusterers = function () {
    // FIXME: This is not the best way to do the cluster feature.
    var zoom = this.googleMap.getZoom();
    if (this.clusterer) {
        if (zoom < this.options.clustererMaxZoom) {
            this.clusterer.addMarkers(this.clusterMarkers);
        } else {
            this.clusterer.clearMarkers();
        }
    }
};



/**
 * Connects some important events. Should not be called externally.
 */
komoo.Map.prototype.handleEvents = function () {
    var komooMap = this;
    if (window.console) console.log("Connecting map events.");
    // Listen Google Maps map events.
    google.maps.event.addListener(this.googleMap, "click", function (e) {
        if (komooMap.addPanel.is(":hidden")) {
            komooMap.setCurrentOverlay(null);  // Remove the overlay selection
        }
        if (komooMap.mode == komoo.Mode.SELECT_CENTER) {
            komooMap._emit_center_selected(e.latLng);
        }
        komooMap._emit_mapclick(e);
    });

    google.maps.event.addListener(this.googleMap, "idle", function () {
        var bounds = komooMap.googleMap.getBounds();
        if (komooMap.options.autoSaveLocation) {
            komooMap.saveLocation();
        }
        komooMap.keptOverlays.forEach(function (overlay, index, orig) {
            if (!bounds.intersects(overlay.getBounds())) {
                overlay.setMap(null);
            }
        });
        komooMap.keptOverlays.clear();
    });

    google.maps.event.addListener(this.googleMap, "zoom_changed", function () {
        komooMap.closeTooltip();
        komooMap.updateClusterers();
    });

    google.maps.event.addListener(this.googleMap, "projection_changed", function () {
        komooMap.projection = komooMap.googleMap.getProjection();
        komooMap.overlayView = new google.maps.OverlayView();
        komooMap.overlayView.draw = function () { };
        komooMap.overlayView.onAdd = function (d) { };
        komooMap.overlayView.setMap(komooMap.googleMap);
    });

    google.maps.event.addListener(this.googleMap, "rightclick", function (e) {
        if (!komooMap.overlayView) {
            google.maps.event.trigger(komooMap.googleMap, "projection_changed");
        }
        var overlay = komooMap.currentOverlay;
        if (overlay && overlay.getProperties() &&
                overlay.getProperties().userCanEdit) {
            komooMap.deleteNode(e);
        }
    });

    if (this.options.autoSaveMapType) {
        google.maps.event.addListener(this.googleMap, "maptypeid_changed", function () {
            komooMap.saveMapType();
        });
    }
};


komoo.Map.prototype.getVisibleOverlays = function () {
    var bounds = this.googleMap.getBounds();
    if (!bounds) return [];

    var overlays = komoo.collections.makeFeaturesCollection();
    this.overlays.forEach(function (overlay, index, orig) {
        if (!overlay.getMap() && (overlay.getMarker() && !overlay.getMarker().getVisible())) {
            // Dont verify the intersection if overlay is invisible.
            return;
        }
        if (overlay.getBounds()) {
            if (bounds.intersects(overlay.getBounds())) {
                overlays.push(overlay);
            }
        } else if (overlay.getPosition) {
            if (bounds.contains(overlay.getPosition())) {
                overlays.push(overlay);
            }
        }
    });
    return overlays;
};


/**
 * Saves the map location to cookie
 * @property {google.maps.LatLng} center
 */
komoo.Map.prototype.saveLocation = function (center) {
    if (!center) {
        center = this.googleMap.getCenter();
    }
    var zoom = this.googleMap.getZoom();
    komoo.utils.createCookie("lastLocation", center.toUrlValue(), 90);
    komoo.utils.createCookie("lastZoom", zoom, 90);
};


/**
 * Loads the location saved in a cookie and go to there.
 * @see komoo.Map.saveLocation
 * @returns {boolean}
 */
komoo.Map.prototype.goToSavedLocation = function () {
    var lastLocation = komoo.utils.readCookie("lastLocation");
    var zoom = parseInt(komoo.utils.readCookie("lastZoom"), 10);
    if (lastLocation && zoom) {
        lastLocation = lastLocation.split(",");
        var center = new google.maps.LatLng(lastLocation[0], lastLocation[1]);
        this.googleMap.setCenter(center);
        this.googleMap.setZoom(zoom);
        if (window.console) console.log("Getting location from cookie...");
        return true;
    }
    return false;
};


/**
 * Saves the map type to cookie
 * @property {google.maps.MapTypeId|String} mapType
 */
komoo.Map.prototype.saveMapType = function (mapType) {
    if (!mapType) {
        mapType = this.googleMap.getMapTypeId();
    }
    komoo.utils.createCookie("mapType", mapType, 90);
};


/**
 * Use the map type saved in a cookie.
 * @see komoo.Map.saveMapType
 * @returns {boolean}
 */
komoo.Map.prototype.useSavedMapType = function () {
    var mapType = komoo.utils.readCookie("mapType");
    if (mapType) {
        this.googleMap.setMapTypeId(mapType);
        return true;
    }
    return false;
};


komoo.Map.prototype.updateOverlay = function (overlay, geojson) {
    var geometry;

    // if we got only the geojson, as first parameter, we will try to get the
    // correct overlay
    if (!geojson) {
        geojson = overlay;
        var feature = geojson.features[0];
        overlay = this.getOverlay(feature.properties.type, feature.properties.id);
    }

    // Get the geometry from geojson
    if (geojson.type == "FeatureCollection") {
        geometry = geojson.features[0].geometry;
    } else if (geojson.type == "GeometryCollection") {
        geometry = geojson.geometries[0];
    }

    // Update the overlay geometry
    //if (overlay.getGeometryType == geometry.type)
        //overlay.setCoordinates(geometry.coordinates);
};

komoo.Map.prototype.getZoom = function () {
    return this.googleMap.getZoom();
};

/**
 * Load the features from geoJSON into the map.
 * @param {json} geoJSON The json that will be loaded.
 * @param {boolean} panTo If true pan to the region where overlays are.
 * @param {boolean} [opt_attach=true]
 * @returns {google.maps.MVCObject[]}
 */
komoo.Map.prototype.loadGeoJSON = function (geoJSON, panTo, opt_attach) {
    // TODO: Refactoring
    // TODO: Use the correct color
    // TODO: Add a hidden marker for each polygon/polyline
    // TODO: Document the geoJSON properties:
    // - userCanEdit
    // - type (community, need...)
    var komooMap = this;
    var featureCollection;
    var overlays = komoo.collections.makeFeatureCollection({map: this});

    if (opt_attach === undefined) {
        opt_attach = true;
    }

    var polygonOptions = $.extend({
        clickable: true,
        editable: false,
        zIndex: 1
    }, this.options.overlayOptions);
    var polylineOptions = $.extend({
        clickable: true,
        editable: false,
        zIndex: 3
    }, this.options.overlayOptions);
    var markerOptions = {};

    if (!geoJSON.type) return; // geoJSON is invalid.

    if (geoJSON.type == "FeatureCollection") {
        featureCollection = geoJSON.features;
    }
    var overlay;
    if (!featureCollection) {
        return [];
    }
    featureCollection.forEach(function (feature, index, orig) {
        var geometry = feature.geometry;
        if (!geometry) {
            return;
        }
        overlay = komooMap.getOverlay(feature.properties.type, feature.properties.id);
        if (!overlay)
            var type = komooMap.overlayOptions[feature.properties.type];
            overlay = komoo.features.makeFeature(feature);
            if (type) {
                overlay.minZoomGeometry = type.minZoomGeometry;
                overlay.maxZoomGeometry = type.maxZoomGeometry;
                overlay.minZoomMarker = type.minZoomMarker;
                overlay.maxZoomMarker = type.maxZoomMarker;
            }
        var paths = [];
        if (feature.properties && feature.properties.type && komooMap.overlayOptions[feature.properties.type]) {
            var color = komooMap.overlayOptions[feature.properties.type].color;
            var border = komooMap.overlayOptions[feature.properties.type].border;
            var zIndex = komooMap.overlayOptions[feature.properties.type].zIndex;
            polygonOptions.fillColor = color;
            polygonOptions.strokeColor = border;
            polygonOptions.strokeWeight = 1.5;
            polygonOptions.zIndex = zIndex; //feature.properties.type == "community" ? 1 : 2
            polylineOptions.strokeColor = border;
        } else {
            // TODO: set a default color
        }
        if (geometry.type == "Polygon") {
            if (geometry.coordinates.length == 0 || geometry.coordinates[0].length == 0) return;
            overlay.setOptions(polygonOptions);
        } else if (geometry.type == "LineString" || geometry.type == 'MultiLineString') {
            if (geometry.coordinates.length == 0) return;
            overlay.setOptions(polylineOptions);
        } else if (geometry.type == "MultiPoint" || geometry.type == "Point") {
            if (geometry.coordinates.length == 0) return;
        }
        // Dont attach or return the overlays already loaded
        if (overlay) {
            overlay = komooMap.loadedOverlays[feature.properties.type + "_" + feature.properties.id] || overlay;
            if (!komooMap.loadedOverlays[overlay.getProperties().type + "_" + overlay.getProperties().id]) {
                komooMap.overlays.push(overlay);
                komooMap.loadedOverlays[overlay.getProperties().type + "_" + overlay.getProperties().id] = overlay;
                komooMap._attachOverlayEvents(overlay);
            }
            overlays.push(overlay);
            if (opt_attach) {
                overlay.setMap(komooMap.googleMap);
            }
            var overlaysByType = komooMap.overlaysByType[overlay.getProperties().type];
            var categories = overlay.getProperties().categories;
            if (categories && categories.length) {
                categories.forEach(function(category, index, orig) {
                    if (overlaysByType[category.name]) {
                        overlaysByType[category.name].push(overlay);
                    }
                });
            } else {
                overlaysByType["uncategorized"].push(overlay);
            }
            if (!overlay.getMarker()) {
                overlay.setMarker(new komoo.geometries.Point({
                        visible: true,
                        clickable: true
                }));
                if (overlay.getMarker()) {
                    overlay.getMarker().setMap(komooMap.googleMap)
                    overlay.getMarker().setPosition(overlay.getCenter());
                    overlay.getMarker().setIcon(overlay.getIconUrl(komooMap.googleMap.getZoom()));
                    google.maps.event.addListener(overlay.getMarker(), "click", function () {
                        komooMap.googleMap.fitBounds(overlay.getBounds());
                    });
                    if (overlay.getProperties().type == "Community") {
                        komooMap.clusterMarkers.push(overlay.getMarker().getObject());
                    }
                }
            }
            overlay.updateIcon();
        }
    });
    if (panTo && overlay.getBounds()) {
        this.googleMap.fitBounds(overlay.getBounds());
    }

    this._emit_geojson_loaded(geoJSON);
    return overlays;
};


/**
 * Create a GeoJSON with the maps overlays.
 * @param {boolean} newOnly
 * @returns {json}
 */
komoo.Map.prototype.getGeoJSON = function (options) {
    var geoJSON;
    var geoms = [];
    var list;
    if (!options) {
        options = {};
    }
    var newOnly = options.newOnly || false;
    var currentOnly = options.currentOnly || false;
    var createGeometryCollection = options.geometryCollection || false;
    if (newOnly) {
        list = this.newOverlays;
    } else if (currentOnly) {
        list = komoo.collections.makeFeatureCollection({map: this});
        list.push(this.currentOverlay);
    } else {
        list = this.overlays;
    }
    if (createGeometryCollection) {
        // TODO
        geoJSON = {
            "type": "GeometryCollection",
            "geometries": geoms
        };
    } else {
        return list.getGeoJson();
    }
    list.forEach(function (overlay, index, orig) {
        geoms.push(overlay.getGeoJsonGeometry());
    });
    return geoJSON;
};


/**
 * Gets a list of overlays of specific type.
 * @param {String} type
 * @param {String[]} [opt_categories=[]]
 * @param {boolean} [opt_strict=false]
 * @returns {google.maps.MVCObject[]} overlays that matches the parameters.
 */
komoo.Map.prototype.getOverlaysByType = function (type, opt_categories, opt_strict) {
    var komooMap = this;
    var overlays = new komoo.collections.makeFeatureCollection({map: this});
    var categories = opt_categories;
    if (!this.overlaysByType[type]) {
        return false;
    }
    if (!categories) {
        categories = [];
        this.overlaysByType[type].forEach(function (overlays, category, orig) {
            categories.push(category);
        });
    } else if (categories.length === 0) {
        categories = ["uncategorized"];
    }
    categories.forEach(function (category, index, orig) {
        if (komooMap.overlaysByType[type][category]) {
            komooMap.overlaysByType[type][category].forEach(function (overlay, index, orig) {
                if (!opt_strict || !overlay.getProperties().categories || overlay.getProperties().categories.length == 1) {
                    overlays.push(overlay);
                }
            });
        }
    });
    return overlays;
};


/**
 * Hides some overlays.
 * @property {google.maps.MVCObject[]} overlays
 * @returns {number} How many overlays were hidden.
 */
komoo.Map.prototype.hideOverlays = function (overlays) {
    return overlays.hide();
};


/**
 * Hides overlays of specific type.
 * @param {String} type
 * @param {String[]} [opt_categories=[]]
 * @param {boolean} [opt_strict=false]
 * @returns {number} How many overlays were hidden.
 */
komoo.Map.prototype.hideOverlaysByType = function (type, opt_categories, opt_strict) {
    var overlays = this.getOverlaysByType(type, opt_categories, opt_strict);
    return this.hideOverlays(overlays);
};


/**
 * Hides all overlays.
 * @returns {number} How many overlays were hidden.
 */
komoo.Map.prototype.hideAllOverlays = function () {
    return this.hideOverlays(this.overlays);
};


/**
 * Makes visible some overlays.
 * @property {google.maps.MVCObject[]} overlays
 * @returns {number} How many overlays were displayed.
 */
komoo.Map.prototype.showOverlays = function (overlays) {
    return overlays.show();
};


/**
 * Makes visible overlays of specific type.
 * @param {String} type
 * @param {String[]} [opt_categories=[]]
 * @param {boolean} [opt_strict=false]
 * @returns {number} How many overlays were displayed.
 */
komoo.Map.prototype.showOverlaysByType = function (type, opt_categories, opt_strict) {
    var overlays = this.getOverlaysByType(type, opt_categories, opt_strict);
    return this.showOverlays(overlays);
};


/**
 * Makes visible all overlays.
 * @returns {number} How many overlays were displayed.
 */
komoo.Map.prototype.showAllOverlays = function () {
    return this.showOverlays(this.overlays);
};


/**
 * Remove all overlays from map.
 */
komoo.Map.prototype.clear = function () {
    this.initOverlaysByTypeObject();
    delete this.loadedOverlays;
    delete this.fetchedTiles;
    this.loadedOverlays = {};
    this.fetchedTiles = {};
    this.overlays.removeAllFromMap()
    this.overlays.clear()
    this.clusterMarkers = [];
    if (this.clusterer) {
        this.clusterer.clearMarkers();
    }
};


komoo.Map.prototype.deleteNode = function (e) {
    var nodeWidth = 6;
    var proj = this.googleMap.getProjection();
    var clickPoint = proj.fromLatLngToPoint(e.latLng);
    var poly = this.currentOverlay;
    var minDist = 512;
    var selectedIndex = -1;
    var pathIndex = -1;
    var paths;
    if (poly.getPaths) {
        paths = poly.getPaths();
    } else if (poly.getPath) {
        paths = new google.maps.MVCArray([poly.getPath()]);
    } else {
        return false;
    }
    var nodeToDelete;
    var pathWithNode;
    paths.forEach(function (path, i) {
        for (var n = 0 ; n < path.getLength() ; n++) {
            var nodePoint = proj.fromLatLngToPoint(path.getAt(n));
            var dist = Math.sqrt(Math.pow(Math.abs(clickPoint.x - nodePoint.x), 2) + Math.pow(Math.abs(clickPoint.y - nodePoint.y), 2));
            if (dist < minDist) {
                minDist = dist;
                selectedIndex = n;
                pathIndex = i;
                nodeToDelete = path.getAt(n);
                pathWithNode = path;
            }
        }
    });
    // Check if we are clicking inside the node
    var ovProj = this.overlayView.getProjection();
    var clickPx = ovProj.fromLatLngToContainerPixel(e.latLng);
    var nodePx = ovProj.fromLatLngToContainerPixel(nodeToDelete);
    var xDist = Math.abs(nodePx.x - clickPx.x);
    var yDist = Math.abs(nodePx.y - clickPx.y);
    if (xDist < nodeWidth && yDist < nodeWidth) {
        pathWithNode.removeAt(selectedIndex);
        if (pathWithNode.getLength() == 0) {
            paths.removeAt(pathIndex);
        }
        return true;
    }
    return false;
};


/**
 * Set the current overlay and display the edit controls.
 * @param {google.maps.Polygon|google.maps.Polyline|null} overlay
 *        The overlay to be set as current or null to remove the selection.
 */
komoo.Map.prototype.setCurrentOverlay = function (overlay) {
    if (this.currentOverlay == overlay) return;
    $("#komoo-map-add-button, #komoo-map-cut-out-button, #komoo-map-delete-button").hide();
    this.currentOverlay = overlay;
    if (this.currentOverlay && this.currentOverlay.getProperties() &&
            this.currentOverlay.getProperties().userCanEdit) {
        this.currentOverlay.setEditable(true);
        if (this.currentOverlay.getGeometry().getGeometryType() == 'Polygon') {
            this.drawingMode_ = komoo.OverlayType.POLYGON;
            $("#komoo-map-cut-out-button").show();
        } else if (this.currentOverlay.getGeometry().getGeometryType() == 'LineString') {
            this.drawingMode_ = komoo.OverlayType.POLYLINE;
        } else {
            this.drawingMode_ = komoo.OverlayType.POINT;
        }
        $("#komoo-map-add-button, #komoo-map-delete-button").show();
    }
};


/**
 * Enable or disable the drawing feature.
 * @param {boolean} editable
 *        true to enable the drawing feature and false to disable.
 */
komoo.Map.prototype.setEditable = function (editable) {
    var options;
    this.editable = editable;
    if (!this.drawingManager) {
        this._initDrawingManager();
    }
    if (editable) {  // Enable
        this.drawingManagerOptions.drawingMode = null;
        if (this.options.defaultDrawingControl) {
            this.drawingManagerOptions.drawingControl = true;
        }
        this.setCurrentOverlay(this.currentOverlay);
        if (this.editToolbar) {
            this.editToolbar.show();
        }
        if (this.mainPanel) {
            this.mainPanel.show();
        }
    } else {  // Disable
        this.drawingManagerOptions.drawingMode = null;
        if (this.options.defaultDrawingControl) {
            this.drawingManagerOptions.drawingControl = false;
        }
        if (this.currentOverlay && this.currentOverlay.setEditable) {
            this.currentOverlay.setEditable(false);
        }
        if (this.editToolbar) {
            this.editToolbar.hide();
        }
        if (this.mainPanel) {
            this.mainPanel.hide();
        }
        this.setEditMode(null);
    }
    if (this.drawingManager) {
        this.drawingManager.setOptions(this.drawingManagerOptions);
    }
};


/**
 * Show a box containing the Google Street View layer.
 * @param {boolean} flag
 *        Sets to true to make Street View visible or false to hide.
 * @param {google.maps.LatLng} position
 */
komoo.Map.prototype.setStreetView = function (flag, position) {
    // FIXME: Add close button to the Street View panel
    // TODO: Define the panel position and size
    if (!this.streetView) {
        // Creates the StreetView object only when needed.
        this._createStreetViewObject();
    }
    if (!position) {
        position = this.googleMap.getCenter();
    }
    this.streetView.setPosition(position);
    if (flag) {
        this.streetViewPanel.show();
    } else {
        this.streetViewPanel.hide();
    }
    this.streetView.setVisible(flag);
};


/**
 * Use the HTML5 GeoLocation to set the user location as the map center.
 */
komoo.Map.prototype.goToUserLocation = function () {
    var komooMap = this;
    var pos;
    if (google.loader.ClientLocation) { // Gets from google service
        pos = new google.maps.LatLng(google.loader.ClientLocation.latitude,
                                         google.loader.ClientLocation.longitude);
        this.googleMap.setCenter(pos);
        if (window.console) console.log("Getting location from Google...");
    }
    if (navigator.geolocation) { // Uses HTML5
        navigator.geolocation.getCurrentPosition(function(position) {
            pos = new google.maps.LatLng(position.coords.latitude,
                                             position.coords.longitude);
            komooMap.googleMap.setCenter(pos);
            if (window.console) console.log("Getting location from navigator.geolocation...");
        }, function () {
            if (window.console) console.log("User denied access to navigator.geolocation...");
        });
    }
};


/**
 * Go to an address or to latitude, longitude position.
 * @param {String|google.maps.LatLng|number[]} position
 *        An address or a pair latitude, longitude.
 */
komoo.Map.prototype.goTo = function (position, optDisplayMarker) {
    if (optDisplayMarker == undefined) optDisplayMarker = true;
    if (position instanceof Array)
        position = new google.maps.LatLng(position[0], position[0]);
    var komooMap = this;
    var latLng;
    function _go (latLng) {
        if (latLng) {
            komooMap.googleMap.panTo(latLng);
            if (! komooMap.searchMarker) {
                komooMap.searchMarker = new google.maps.Marker();
                komooMap.searchMarker.setMap(komooMap.googleMap);
            }
            if (optDisplayMarker) komooMap.searchMarker.setPosition(latLng);
        }
    }
    if (typeof position == "string") { // Got address
        var request = {
            address: position,
            region: this.region
        };
        this.geocoder.geocode(request, function (result, status_) {
            if (status_ == google.maps.GeocoderStatus.OK) {
                var first_result = result[0];
                latLng = first_result.geometry.location;
                _go(latLng);
            }
        });
    } else {
        if (position instanceof Array) {
            latLng = new google.maps.LatLng(position[0], position[1]);
        } else {
            latLng = position;
        }
        _go(latLng);
    }
};


/**
 * Alias to {@link komoo.Map.goTo}.
 * @see komoo.Map.goTo
 */
komoo.Map.prototype.panTo = function (position, optDisplayMarker) {
    return this.goTo(position, optDisplayMarker);
};


komoo.Map.prototype.editOverlay = function (overlay) {
    if (!overlay || !overlay.getProperties() || !overlay.getProperties().userCanEdit) {
        return false;
    }
    if (overlay.setEditable) {
        overlay.setEditable(true);
    } else if (overlay.setDraggable) {
        overlay.setDraggable(true);
    }
    this.type = overlay.getProperties().type;
    $(".map-panel-title", this.addPanel).text(gettext("Edit"));
    this.addPanel.css({"margin-top": "33px"});
    this.addPanel.show();
    return true;
};


/**
 * Attach some events to overlay.
 * @param {google.maps.Polygon|google.maps.Polyline} overlay
 */
komoo.Map.prototype._attachOverlayEvents = function (overlay) {
    var komooMap = this;
    if (overlay.getPaths) {
        // Removes stroke from polygons.
        overlay.setOptions({strokeWeight: 1.5});
    }

    google.maps.event.addListener(overlay, "rightclick", function (e) {
        var overlay_ = this;
        if (overlay_.properties && overlay_.properties.userCanEdit &&
                overlay_ == komooMap.currentOverlay) {
            if (!komooMap.overlayView) {
                google.maps.event.trigger(komooMap.googleMap, "projection_changed");
            }
            komooMap.deleteNode(e);
        }
    });

    google.maps.event.addListener(overlay, "click", function (e, o) {
        var overlay_ = this;
        if (window.console) console.log("Clicked on overlay");
        if (komooMap.mode == komoo.Mode.SELECT_CENTER) {
            komooMap._emit_center_selected(e.latLng);
            return;
        }
        if (komooMap.addPanel.is(":visible") && overlay_ != komooMap.currentOverlay) {
            if (window.console) console.log("Clicked on unselected overlay");
            if (!overlay_.getProperties().userCanEdit) {
                return;
            }
        }
        if (komooMap.editMode == komoo.EditMode.DELETE && overlay_.getProperties() &&
                overlay_.getProperties().userCanEdit) {
            //komooMap.setCurrentOverlay(null);
            var l = 0;
            if (overlay_.getGeometryType() == komoo.GeometryType.POLYGON) {  // Clicked on polygon.
                var paths = overlay_.getGeometry().getPaths();
                l = paths.getLength();
                paths.forEach(function (path, i) {
                    // Delete the correct path.
                    if (komoo.utils.isPointInside(e.latLng, path)) {
                        paths.removeAt(i);
                        l--;
                    }
                });
            } else if (overlay_.getGeometryType() == komoo.GeometryType.MULTIPOINT) {
                var markers = overlay_.getGeometry().getMarkers();
                l = markers.getLength();
                if (o) {
                    markers.forEach(function (marker, i) {
                        if (marker == o) {
                            markers.removeAt(i);
                            marker.setMap(null);
                            l--;
                        }
                    });
                }
            }
            if (l === 0) {  // We had only one path, or the overlay wasnt a polygon.
                //overlay_.setMap(null);
            } else {
                komooMap.setCurrentOverlay(overlay_);
            }
            // TODO: (IMPORTANT) Remove the overlay from komooMap.overlays
            komooMap.setEditMode(null);
            komooMap._emit_changed();
        } else {
            komooMap.setEditMode(null);
            komooMap.setCurrentOverlay(overlay_);  // Select the clicked overlay
            komooMap.closeTooltip();
            setTimeout(function () { komooMap.openInfoWindow(overlay_, e.latLng) }, 200);
        }
    });

    google.maps.event.addListener(overlay, "dblclick", function (e, o) {
        e.stop();
        var url = this.getUrl();
        if (url) {
            window.location = url;
        }
    });

    google.maps.event.addListener(overlay, "mousemove", function (e) {
        if (komooMap.tooltip.overlay == overlay || komooMap.addPanel.is(":visible") ||
                !komooMap.options.enableInfoWindow) {
            return;
        }
        clearTimeout(komooMap.tooltip.timer);
        var delay = 0;
        if (overlay.getProperties().type == "Community") {
            delay = 400;
        }
        komooMap.tooltip.timer = setTimeout(function () {
            if (komooMap.tooltip.isMouseover || komooMap.addPanel.is(":visible") || komooMap.mode == komoo.Mode.SELECT_CENTER) {
                return;
            }
            komooMap.openTooltip(overlay, e.latLng);
        }, delay);
    });

    google.maps.event.addListener(overlay, "mouseout", function (e) {
        var delay = 0;
        clearTimeout(komooMap.tooltip.timer);
        //if (!komooMap.tooltip.isMouseover) {
            //komooMap.tooltip.timer = setTimeout(function () {
                //if (!komooMap.tooltip.isMouseover) {
                    komooMap.closeTooltip();
                //}
            //}, delay);
        //}
    });
};

komoo.Map.prototype.setDrawingMode = function (type, overlayType) {
    if (!overlayType) {
        overlayType = type;
        type = this.type;
    }
    this.type = type;
    this.setEditMode(komoo.EditMode.DRAW);
    this.setCurrentOverlay(null);  // Remove the overlay selection
    this.drawingMode_ = this.drawingMode[overlayType];
    this.drawingManager.setDrawingMode(this.drawingMode_);
    var OverlayTypeTitle = {};
    OverlayTypeTitle[komoo.OverlayType.POLYGON] = gettext("Add shape");
    OverlayTypeTitle[komoo.OverlayType.POLYLINE] = gettext("Add line");
    OverlayTypeTitle[komoo.OverlayType.POINT] = gettext("Add point");
    $(".map-panel-title", this.addPanel).text(OverlayTypeTitle[overlayType]);
    if (this.overlayOptions[this.type]) {
        var color = this.overlayOptions[this.type].color;
        var border = this.overlayOptions[this.type].border;
        var zIndex = this.overlayOptions[this.type].zIndex;
        this.drawingManagerOptions.polylineOptions.strokeColor = border;
        this.drawingManagerOptions.polygonOptions.fillColor = color;
        this.drawingManagerOptions.polygonOptions.strokeColor = border;
        this.drawingManagerOptions.polygonOptions.zIndex = zIndex;
    }
};

/**
 * Initialize the Google Maps Drawing Manager.
 */
komoo.Map.prototype._initDrawingManager = function () {
    var komooMap = this;
    var controlsPosition = google.maps.ControlPosition.TOP_LEFT;

    this.drawingManagerOptions = {
        map: this.googleMap,
        drawingControl: false,
        drawingControlOptions: {
            position: controlsPosition,
            drawingModes: [
                komoo.OverlayType.POLYGON,
                komoo.OverlayType.POLYLINE,
                komoo.OverlayType.CIRCLE,
                komoo.OverlayType.POINT
            ]
        },
        polygonOptions: $.extend({
            clickable: true,
            editable: false,
            zIndex: 1
        }, this.options.overlayOptions),
        polylineOptions: $.extend({
            clickable: true,
            editable: false
        }, this.options.overlayOptions),
        circleOptions: {
            fillColor: "white",
            fillOpacity: 0.15,
            editable: true,
            zIndex: -1
        },
        drawingMode: komoo.OverlayType.POLYGON
    };
    this.drawingManager = new google.maps.drawing.DrawingManager(
            this.drawingManagerOptions);
    google.maps.event.addListener(this.drawingManager,
            "overlaycomplete", function (e) {
        // FIXME: REWRITE

        var path;
        if (e.overlay.getPath) {
            path = e.overlay.getPath();
        }

        var overlay;
        if ((komooMap.editMode == komoo.EditMode.CUTOUT || komooMap.editMode == komoo.EditMode.ADD) &&
                    e.overlay.getPaths) {
            // Gets the overlays path orientation.
            var paths = komooMap.currentOverlay.getGeometry().getPaths();
            if (paths.length > 0) {
                // Gets the paths orientations.
                var sArea = google.maps.geometry.spherical.computeSignedArea(path);
                var sAreaAdded = google.maps.geometry.spherical.computeSignedArea(
                        paths.getAt(0));
                var orientation = sArea / Math.abs(sArea);
                var orientationAdded = sAreaAdded / Math.abs(sAreaAdded);
                // Verify the paths orientation.
                if ((orientation == orientationAdded && komooMap.editMode == komoo.EditMode.CUTOUT) ||
                        orientation != orientationAdded && komooMap.editMode == komoo.EditMode.ADD) {
                    /* Reverse path orientation to correspond to the action  */
                    path = new google.maps.MVCArray(path.getArray().reverse());
                }
            }
            paths.push(path);
            komooMap.currentOverlay.getGeometry().setPaths(paths);
            // Remove the temporary overlay from map
            e.overlay.setMap(null);
            komooMap.setEditMode(komoo.EditMode.DRAW);
        } else if (komooMap.editMode == komoo.EditMode.ADD && e.overlay.getPosition) {
            komooMap.currentOverlay.getGeometry().addMarker(e.overlay);
            komooMap.setEditMode(komoo.EditMode.DRAW);
        } else if (e.overlay.getPosition) {
            overlay = new MultiMarker();
            overlay.addMarker(e.overlay);
            overlay.setMap(komooMap.googleMap);
        } else if (e.overlay.getPath && !e.overlay.getPaths) {
            overlay = new MultiPolyline();
            overlay.addPolyline(e.overlay);
            overlay.setMap(komooMap.googleMap);
        } else {
            overlay = e.overlay;
        }
        if (overlay) {
            var feature = komoo.features.makeFeature({
                'properties': {
                    'userCanEdit': true,
                    'type': komooMap.type,
                    'name': 'sem nome',
                    'alwaysVisible': true
                },
                'geometry': {
                    'type': komooMap.drawingManager.getDrawingMode(),
                }
            });
            var geometry = feature.getGeometry();
            geometry.setObject(overlay);

            // Sets the custom image.
            feature.updateIcon(komooMap.googleMap.getZoom());

            komooMap.overlays.push(feature);
            komooMap.newOverlays.push(feature);
            // Listen events from drawn overlay.
            komooMap._attachOverlayEvents(feature);
            komooMap.setCurrentOverlay(feature);
            komooMap.setEditMode(komoo.EditMode.DRAW);
        }
        if (path) {
            // Emit changed event when edit paths.
            google.maps.event.addListener(path, "set_at", function() {
                komooMap._emit_changed();
            });
            google.maps.event.addListener(path, "insert_at", function() {
                komooMap._emit_changed();
            });
        }
        // Switch back to non-drawing mode after drawing a shape.
        komooMap.drawingManager.setDrawingMode(null);
        
        komooMap._emit_changed();
        return true;
    });

    if (!this.options.defaultDrawingControl) {
        // Adds new HTML elements to the map.
        var polygonButton = komoo.createMapButton(gettext("Add shape"), gettext("Draw a shape"), function (e) {
            komooMap.setDrawingMode(komoo.OverlayType.POLYGON);
        }).attr("id", "map-add-" + komoo.OverlayType.POLYGON);

        var lineButton = komoo.createMapButton(gettext("Add line"), gettext("Draw a line"), function (e) {
            komooMap.setDrawingMode(komoo.OverlayType.POLYLINE);
        }).attr("id", "map-add-" + komoo.OverlayType.POLYLINE);

        var markerButton = komoo.createMapButton(gettext("Add point"), gettext("Add a marker"), function (e) {
            komooMap.setDrawingMode(komoo.OverlayType.POINT);
        }).attr("id", "map-add-" + komoo.OverlayType.POINT);

        var addMenu = komoo.createMapMenu(gettext("Add new..."), [polygonButton, lineButton, markerButton]);
        //this.editToolbar.append(addMenu);
        this.addItems = $(".map-container", addMenu);

        var addButton = komoo.createMapButton(gettext("Add"), gettext("Add another region"), function (e) {
            if (komooMap.editMode == komoo.EditMode.ADD) {
                komooMap.setEditMode(komoo.EditMode.DRAW);
            } else {
                komooMap.setEditMode(komoo.EditMode.ADD);
            }
            komooMap.drawingManager.setDrawingMode(komooMap.drawingMode[komooMap.drawingMode_]);
        });
        addButton.hide();
        addButton.attr("id", "komoo-map-add-button");
        this.editToolbar.append(addButton);

        var cutOutButton = komoo.createMapButton(gettext("Cut out"), gettext("Cut out a hole from a region"), function (e) {
            if (komooMap.editMode == komoo.EditMode.CUTOUT) {
                komooMap.setEditMode(komoo.EditMode.DRAW);
            } else {
                komooMap.setEditMode(komoo.EditMode.CUTOUT);
            }
            komooMap.drawingManager.setDrawingMode(komooMap.drawingMode[komooMap.drawingMode_]);
        });
        cutOutButton.hide();
        cutOutButton.attr("id", "komoo-map-cut-out-button");
        this.editToolbar.append(cutOutButton);

        var deleteButton = komoo.createMapButton(gettext("Delete"), gettext("Delete a region"), function (e) {
            if (komooMap.editMode == komoo.EditMode.DELETE) {
                komooMap.setEditMode(komoo.EditMode.DRAW);
            } else {
                komooMap.setEditMode(komoo.EditMode.DELETE);
            }
            komooMap.drawingManagerOptions.drawingMode = null;
            komooMap.drawingManager.setOptions(komooMap.drawingManagerOptions);
        });
        deleteButton.hide();
        deleteButton.attr("id", "komoo-map-delete-button");
        this.editToolbar.append(deleteButton);

        this.event.bind("editmode_changed", function(e, mode) {
            komooMap.closeInfoWindow();
            komooMap.closeTooltip();
            // Set the correct button style when editMode was changed.
            addButton.removeClass("active");
            cutOutButton.removeClass("active");
            deleteButton.removeClass("active");
            if (mode == "add") {
                addButton.addClass("active");
            } else if (mode == "cutout") {
                cutOutButton.addClass("active");
            } else if (mode == "delete") {
                deleteButton.addClass("active");
            }
        });
    }
};


/**
 * @param {String} mode
 */
komoo.Map.prototype.setMode = function (mode) {
    this.mode = mode;
    if (this.mode != komoo.Mode.DRAW) {
        this.setEditMode(komoo.EditMode.NONE);
    }
    /**
     * @name komoo.Map#mode_changed
     * @event
     */
    this.event.trigger("mode_changed", mode);
};


/**
 * @param {String} mode
 */
komoo.Map.prototype.setEditMode = function (mode) {
    this.editMode = mode;
    if (this.editMode != komoo.EditMode.NONE && this.mode != komoo.Mode.DRAW) {
        this.setMode(komoo.Mode.DRAW);
    }
    /**
     * @name komoo.Map#editmode_changed
     * @event
     */
    this.event.trigger("editmode_changed", mode);
};


/**
 * Initialize the Google Street View.
 */
komoo.Map.prototype._createStreetViewObject = function () {
    var options = {};
    this.streetView = new google.maps.StreetViewPanorama(
            this.streetViewPanel.get(0), options);
};


/**
 * @returns {JQuery}
 */
komoo.Map.prototype._createMainPanel = function () {
    var komooMap = this;
    var panel = $("<div>").addClass("map-panel");
    var addMenu = $("<ul>").addClass("map-menu");

    var tabs = komoo.createMapTab([
        {title: gettext("Filter")},
        {title: gettext("Add")/*, content: addMenu*/}
    ]);

    // Only logged in users can add new items.
    if (!isAuthenticated) {
        var submenuItem = addMenu.append($("<li>").addClass("map-menuitem").text(gettext("Please log in.")));
        submenuItem.bind("click", function (){
            window.location = "/user/login"; // FIXME: Hardcode is evil
        });
        this.options.featureTypes.forEach(function (type, index, orig) {
            komooMap.overlayOptions[type.type] = type;
        });
    } else {
        this.options.featureTypes.forEach(function (type, index, orig) {
            komooMap.overlayOptions[type.type] = type;
            var item = $("<li>").addClass("map-menuitem");
            if (!type.icon) {
                if (type.type == 'OrganizationBranch')
                    type.icon = '/static/img/organization.png';
                else
                    type.icon = '/static/img/' + type.type.toLowerCase() + '.png';
            }
            var icon = $("<img>").attr({src: type.icon}).css("float", "left");
            if (type.disabled) icon.css("opacity", "0.3");
            item.append(icon);

            item.append($("<div>").addClass("item-title").text(type.title).attr("title", type.tooltip));
            var submenu = komooMap.addItems.clone(true).addClass("map-submenu");
            $("div", submenu).hide();
            type.overlayTypes.forEach(function (overlayType, index, orig) {
                $("#map-add-" + overlayType, submenu).addClass("enabled").show();
            });
            var submenuItems = $("div.enabled", submenu);
            if (type.disabled) {
                item.addClass("disabled");
            }
            item.css({
                "position": "relative"
            });
            submenuItems.removeClass("map-button").addClass("map-menuitem"); // Change the class
            submenuItems.bind("click", function () {
                $(".map-submenu", addMenu).hide();
                $(".map-menuitem.selected", komooMap.mainPanel).removeClass("selected");
                item.addClass("selected");
                $(".map-menuitem:not(.selected)", komooMap.mainPanel).addClass("frozen");
            });
            if (submenuItems.length == 1) {
                submenuItems.hide();
                item.bind("click", function () {
                    if (komooMap.addPanel.is(":hidden") && !$(this).hasClass("disabled")) {
                        komooMap.type = type.type;
                        submenuItems.trigger("click");
                    }
                });
            } else {
                item.bind("click", function () {
                    // Menu should not work if add panel is visible.
                    if (komooMap.addPanel.is(":hidden") && !$(this).hasClass("disabled")) {
                        komooMap.type = type.type;
                        submenu.css({"left": item.outerWidth() + "px"});
                        submenu.toggle();
                    }
                });
            }
            submenu.css({
                "top": "0",
                "z-index": "999999"
            });
            item.append(submenu);
            addMenu.append(item);
            type.selector = item;
        });
    }

    panel.css({
        "margin": "10px 5px 10px 10px",
        "width": "180px"
    });

    panel.append(tabs.selector);

    google.maps.event.addListener(this.drawingManager, "drawingmode_changed",
        function (e){
            if (komooMap.drawingManager.drawingMode) {
                komooMap.addPanel.show();
            }
        });


    this.addMenu = addMenu;
    return panel;
};


komoo.Map.prototype._createClosePanel = function () {
    var komooMap = this;
    var panel = $("<div>").addClass("map-panel");
    var content = $("<div>").addClass("content");
    var buttons = $("<div>").addClass("map-panel-buttons");
    var closeButton = $("<div>").addClass("map-button");

    closeButton.append($("<i>").addClass("icon-remove"));
    closeButton.append($("<span>").text(gettext("Close")));

    content.css({"clear": "both"});
    buttons.css({"clear": "both"});
    panel.append(content);
    panel.append(buttons);
    buttons.append(closeButton);

    panel.css({
        "margin": "10px",
        "width": "220px"
    });

    closeButton.click(function (e) {
        komooMap.event.trigger("close_click");
    });
    return panel.hide();
};


/**
 * @returns {JQuery}
 */
komoo.Map.prototype._createAddPanel = function () {
    var komooMap = this;
    var panel = $("<div>").addClass("map-panel");
    var content = $("<div>").addClass("content");
    var title = $("<div>").text(gettext("Title")).addClass("map-panel-title");
    var buttons = $("<div>").addClass("map-panel-buttons");
    var finishButton = $("<div>").text(gettext("Finish")).addClass("map-button");
    var cancelButton = $("<div>").text(gettext("Cancel")).addClass("map-button");

    function button_click () {
        $(".map-menuitem.selected", komooMap.addMenu).removeClass("selected");
        $(".frozen", komooMap.mainPanel).removeClass("frozen");
        komooMap.drawingManager.setDrawingMode(null);
        panel.hide();
    }
    cancelButton.bind("click", function () {
        button_click();
        if (komooMap.newOverlays.length > 0) { // User drew a overlay, so remove it.
            komooMap.newOverlays.forEach(function (item, index, orig) {
                var overlay = komooMap.overlays.pop(); // The newly created overlay should be the last at array.
                overlay.setMap(null);
            });
            komooMap.newOverlays.clear();
        }
        /**
         * @name komoo.Map#cancel_click
         * @event
         */
        komooMap.event.trigger("cancel_click");
        komooMap.type = null;
        komooMap.setEditMode(undefined);
    });
    finishButton.bind("click", function () {
        button_click();
        /**
         * @name komoo.Map#finish_click
         * @event
         */
        komooMap.event.trigger("finish_click", komooMap.overlayOptions[komooMap.type]);
        komooMap.type = null;
        komooMap.setEditMode(undefined);
    });

    content.css({"clear": "both"});
    buttons.css({"clear": "both"});
    content.append(this.editToolbar);
    panel.append(title);
    panel.append(content);
    panel.append(buttons);
    buttons.append(finishButton);
    buttons.append(cancelButton);

    panel.css({
        "margin": "10px",
        "width": "220px"
    });

    return panel.hide();
};


/**
 * Sets to the select_center mode to user select the center point of radius filter.
 * Emits center_selected event when done.
 * @param {number} [opt_radius]
 * @param {function} [opt_callBack] Optional callback function. The callback parameters are latLng and circle.
 *                   latLng receives a google.maps.LatLng object. circle receives google.maps.Circle object.
 */
komoo.Map.prototype.selectCenter = function (opt_radius, opt_callBack) {
    var komooMap = this;
    this.setMode(komoo.Mode.SELECT_CENTER);
    var handler = function (e, latLng, circle) {
        if (typeof opt_radius == "number") {
            circle.setRadius(opt_radius);
        }
        if (typeof opt_callBack == "function") {
            opt_callBack(latLng, circle);
        }
        komooMap.event.unbind("center_selected", handler);
    };
    this.event.bind("center_selected", handler);
};


/**
 * @param {string} overlayType
 * @param {number} id
 * @returns {overlay}
 */
komoo.Map.prototype.getOverlay = function (overlayType, id) {
    return this.loadedOverlays[overlayType + "_" + id];
};


/**
 * @param {overlay | string} overlay
 * @param {number} id
 * @returns {boolean}
 */
komoo.Map.prototype.centerOverlay = function (overlay, id) {
    var overlayType;
    if (typeof overlay == "string") {
        overlayType = overlay;
        overlay = this.getOverlay(overlayType, id);
    }
    if (!overlay) {
        return false;
    }

    this.panTo(overlay.getCenter(), false);
    return true;
}


/**
 * @param {Overlay | string} overlay
 * @param {number} id
 * @returns {boolean}
 */
komoo.Map.prototype.highlightOverlay = function (overlay, id) {
    var overlayType;
    if (typeof overlay == "string") {
        overlayType = overlay;
        overlay = this.getOverlay(overlayType, id);
    }

    if (!overlay) return false;
    if (overlay.isHighlighted()) return true;

    overlay.setHighlight(true);
    this.closeInfoWindow();
    this.openInfoWindow(overlay, overlay.getCenter());

    return true;
};


komoo.Map.prototype._emit_geojson_loaded = function (e) {
    /**
     * @name komoo.Map#geojson_loaded
     * @event
     */
    this.updateClusterers();
    this.event.trigger("geojson_loaded", e);
};


komoo.Map.prototype._emit_mapclick = function (e) {
    /**
     * @name komoo.Map#mapclick
     * @event
     */
    this.event.trigger("mapclick", e);
};


komoo.Map.prototype._emit_overlayclick = function (e) {
    /**
     * @name komoo.Map#overlayclick
     * @event
     */
    this.event.trigger("overlayclick", e);
};


komoo.Map.prototype._emit_center_selected = function (latLng) {
    var komooMap = this;
    if (!this.radiusCircle) {
        this.radiusCircle = new google.maps.Circle({
                visible: true,
                radius: 100,
                fillColor: "white",
                fillOpacity: 0.0,
                strokeColor: "#ffbda8",
                zIndex: -1
        });

        google.maps.event.addListener(this.radiusCircle, "click", function(e) {
            if (komooMap.mode == komoo.Mode.SELECT_CENTER) {
                komooMap._emit_center_selected(e.latLng);
            }
        });
        this.radiusCircle.setMap(this.googleMap);
    }
    if (!this.centerMarker) {
        this.centerMarker = new google.maps.Marker({
                visible: true,
                icon: "/static/img/marker.png",
                zIndex: 4
        });
        this.centerMarker.setMap(this.googleMap);
    }
    this.centerMarker.setPosition(latLng);
    this.radiusCircle.setCenter(latLng);
    /**
     * @name komoo.Map#center_selecter
     * @event
     */
    this.event.trigger("center_selected", [latLng, this.radiusCircle]);
    this.setMode(null);
};


komoo.Map.prototype._emit_changed = function (e) {
    /**
     * @name komoo.Map#changed
     * @event
     */
    this.event.trigger("changed", e);
};


/**
 * @returns {JQuery}
 */
komoo.createMapButton = function (name, title, onClick) {
    var selector = $("<div>").text(name).addClass("map-button");
    selector.attr("title", title);
    selector.bind("click", onClick);
    return selector;
};


/**
 * @returns {JQuery}
 */
komoo.createMapMenu = function (name, items) {
    var selector = $("<div>").text(name).addClass("map-menu");
    var container = $("<div>").addClass("map-container").hide();
    items.forEach(function (item, index, orig) {
        container.append(item);
        item.css({"clear": "both", "float": "none"});
        item.bind("click", function () { container.hide(); });
    });
    selector.append(container);
    selector.hover(function () { container.show(); },
                   function () { container.hide(); });
    return selector;
};


/**
 * @returns {JQuery}
 */
komoo.createMapTab = function (items) {
    var tabs = {
        items: {},
        selector: $("<div>"),
        tabsSelector: $("<div>").addClass("map-tabs"),
        containersSelector: $("<div>").addClass("map-container")
    };
    tabs.selector.append(tabs.tabsSelector, tabs.containersSelector);
    items.forEach(function (item, index, orig) {
        var tab = {
            tabSelector: $("<div>").text(item.title).addClass("map-tab").css({"border": "0px"}),
            containerSelector: $("<div>").addClass("map-tab-container").hide()
        };
        if (item.content) tab.containerSelector.append(item.content);
        tab.tabSelector.click(function () {
            if (tabs.current && tabs.current != tab) {
                tabs.current.tabSelector.removeClass("selected");
                tabs.current.containerSelector.hide();
            }
            tabs.current = tab;
            tab.tabSelector.toggleClass("selected");
            tab.containerSelector.toggle();
        });

        tabs.items[item.title] = tab;
        tab.tabSelector.css({"width": 100 / items.length + "%"});
        tabs.tabsSelector.append(tab.tabSelector);
        tabs.containersSelector.append(tab.containerSelector);
    });
    return tabs;
};

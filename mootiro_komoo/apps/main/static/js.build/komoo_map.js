/**
 * View, create and edit regions on Google Maps.
 *
 * @name map.js
 * @fileOverview A simple way to use Google Maps.
 * @version 0.1.0b
 * @author Komoo Team
 * @copyright (c) 2012 it3s
 */

window.komoo||(komoo={}),komoo.event||(komoo.event=google.maps.event),komoo.CLEAN_MAPTYPE_ID="clean",komoo.GeometryType={POINT:"Point",MULTIPOINT:"MultiPoint",POLYGON:"Polygon",POLYLINE:"LineString"},komoo.MapOptions={fetchUrl:"/get_geojson?",editable:!0,useGeoLocation:!1,defaultDrawingControl:!1,featureTypes:[],autoSaveLocation:!1,autoSaveMapType:!1,enableInfoWindow:!0,displayClosePanel:!1,displaySupporter:!1,enableCluster:!0,fetchFeatures:!0,debug:!1,featureOptions:{visible:!0,fillColor:"#ff0",fillOpacity:.7,strokeColor:"#ff0",strokeWeight:3,strokeOpacity:.7},googleMapOptions:{center:new google.maps.LatLng(-23.55,-46.65),zoom:13,minZoom:2,disableDefaultUI:!1,mapTypeControlOptions:{mapTypeIds:[google.maps.MapTypeId.ROADMAP,komoo.CLEAN_MAPTYPE_ID,google.maps.MapTypeId.HYBRID]},mapTypeId:komoo.CLEAN_MAPTYPE_ID,streetViewControl:!1,scaleControl:!0,panControlOptions:{position:google.maps.ControlPosition.RIGHT_TOP},zoomControlOptions:{position:google.maps.ControlPosition.RIGHT_TOP},scaleControlOptions:{position:google.maps.ControlPosition.RIGHT_BOTTOM,style:google.maps.ScaleControlStyle.DEFAULT}}},komoo.Mode={},komoo.Mode.NAVIGATE="navigate",komoo.Mode.SELECT_CENTER="select_center",komoo.Mode.DRAW="draw",komoo.EditMode={},komoo.EditMode.NONE=null,komoo.EditMode.DRAW="draw",komoo.EditMode.ADD="add",komoo.EditMode.CUTOUT="cutout",komoo.EditMode.DELETE="delete",komoo.Map=function(e,t){var n=this;typeof t!="object"&&(t={}),this.drawingMode={},this.drawingMode[komoo.GeometryType.POINT]=google.maps.drawing.OverlayType.MARKER,this.drawingMode[komoo.GeometryType.POLYGON]=google.maps.drawing.OverlayType.POLYGON,this.drawingMode[komoo.GeometryType.POLYLINE]=google.maps.drawing.OverlayType.POLYLINE;var r=$.extend(komoo.MapOptions.googleMapOptions,t.googleMapOptions);this.mode=komoo.Mode.NAVIGATE,this.options=$.extend(komoo.MapOptions,t),this.drawingManagerOptions={},this.featureOptions={},this.features=komoo.collections.makeFeatureCollectionPlus({map:this}),this.newFeatures=komoo.collections.makeFeatureCollection({map:this}),this.loadedFeatures={},this.event=$("#"+this.options.mapCanvasId),this.googleMap=new google.maps.Map(e,r),this.initProviders(),this.initMapTypes(),this.editToolbar=$("<div>").addClass("map-toolbar").css("margin","5px"),this.initControls(),this.setEditable(this.options.editable),this.initCustomControl(),this.initStreetView(),this.options.useGeoLocation&&this.goToUserLocation(),this.options.autoSaveMapType&&this.useSavedMapType(),this.handleEvents(),this.geocoder=new google.maps.Geocoder,komoo.onMapReady&&komoo.onMapReady(this),this.initEvents()},komoo.Map.prototype.initMapTypes=function(){this.cleanMapType=komoo.maptypes.makeCleanMapType(),this.addMapType(this.cleanMapType)},komoo.Map.prototype.addMapType=function(e){e.setMap(this)},komoo.Map.prototype.initProviders=function(){this.options.fetchFeatures&&(this.featureProvider=komoo.providers.makeFeatureProvider(),this.addProvider(this.featureProvider))},komoo.Map.prototype.addProvider=function(e){e.setMap(this)},komoo.Map.prototype.initEvents=function(e){var t=this,n=this.googleMap,r=["zoom_changed"];r.forEach(function(e,r,i){komoo.event.addListener(n,e,function(n,r){e=="zoom_changed"&&(n=t.googleMap.getZoom()),komoo.event.trigger(t,e,n,r)})})},komoo.Map.prototype.initControls=function(){this.initMarkerClusterer(),this.tooltip=komoo.controls.makeTooltip({map:this}),this.infoWindow=komoo.controls.makeInfoWindow({map:this})},komoo.Map.prototype.openInfoWindow=function(e){if(!this.options.enableInfoWindow)return;this.closeTooltip(),this.infoWindow.open(e)},komoo.Map.prototype.closeInfoWindow=function(){this.infoWindow.close()},komoo.Map.prototype.openTooltip=function(e){var t=e||{};if(!this.options.enableInfoWindow||this.addPanel.is(":visible")||this.infoWindow.isMouseover||this.tooltip.feature==t.feature||t.feature&&t.feature==this.infoWindow.feature)return;this.tooltip.open(t)},komoo.Map.prototype.closeTooltip=function(){clearTimeout(this.tooltip.timer),this.tooltip.close()},komoo.Map.prototype.initCustomControl=function(){this.options.defaultDrawingControl||(this.closePanel=this._createClosePanel(),this.options.displayClosePanel&&this.closePanel.show(),this._createMainPanel(),this.addPanel=this._createAddPanel(),this.googleMap.controls[google.maps.ControlPosition.TOP_LEFT].push(this.addPanel.get(0)),this.googleMap.controls[google.maps.ControlPosition.TOP_LEFT].push(this.closePanel.get(0)),this.options.displaySupporter&&(this.supportersBox=$("<div>"),this.supportersBox.attr("id","map-supporters"),this.googleMap.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(this.supportersBox.get(0)),this.licenseBox=$("<div>"),this.licenseBox.attr("id","map-license"),this.licenseBox.html('Este conteúdo é disponibilizado nos termos da licença <a href="http://creativecommons.org/licenses/by-sa/3.0/deed.pt_BR">Creative Commons - Atribuição - Partilha nos Mesmos Termos 3.0 Não Adaptada</a>; pode estar sujeito a condições adicionais. Para mais detalhes, consulte as Condições de Uso.'),this.googleMap.controls[google.maps.ControlPosition.BOTTOM_LEFT].push(this.licenseBox.get(0))))},komoo.Map.prototype.setSupportersContent=function(e){this.supportersBox&&this.supportersBox.append(e.show())},komoo.Map.prototype.initMarkerClusterer=function(){var e=this;window.MarkerClusterer&&this.options.enableCluster&&(window.console&&console.log("Initializing Marker Clusterer support."),this.clusterer=komoo.controls.makeFeatureClusterer({map:e}),google.maps.event.addListener(this.clusterer,"mouseover",function(t,n){var t=t.getArray();t.sort(function(e,t){return e.getProperty("lastUpdate")<t.getProperty("lastUpdate")}),e.openTooltip({feature:t[0],features:t,position:n})}),google.maps.event.addListener(this.clusterer,"mouseout",function(t){e.closeTooltip()}))},komoo.Map.prototype.initStreetView=function(){window.console&&console.log("Initializing StreetView support."),this.streetViewPanel=$("<div>").addClass("map-panel").height("100%").width("50%"),this.googleMap.controls[google.maps.ControlPosition.TOP_LEFT].push(this.streetViewPanel.get(0)),this.streetViewPanel.hide(),this._createStreetViewObject()},komoo.Map.prototype._createStreetViewObject=function(){var e=this,t={enableCloseButton:!0,visible:!1};this.streetView=new google.maps.StreetViewPanorama(this.streetViewPanel.get(0),t),this.googleMap.setStreetView(this.streetView),google.maps.event.addListener(this.streetView,"visible_changed",function(){e.streetView.getVisible()?e.streetViewPanel.show():e.streetViewPanel.hide()})},komoo.Map.prototype.setStreetView=function(e,t){t||(t=this.googleMap.getCenter()),this.streetView.setPosition(t),e?this.streetViewPanel.show():this.streetViewPanel.hide(),this.streetView.setVisible(e)},komoo.Map.prototype.handleEvents=function(){var e=this;window.console&&console.log("Connecting map events."),google.maps.event.addListener(this.googleMap,"click",function(t){e.addPanel.is(":hidden")&&e.setCurrentFeature(null),e.mode==komoo.Mode.SELECT_CENTER&&e._emit_center_selected(t.latLng),e._emit_mapclick(t)}),google.maps.event.addListener(this.googleMap,"idle",function(){e.options.autoSaveLocation&&e.saveLocation()}),google.maps.event.addListener(this.googleMap,"zoom_changed",function(){e.closeTooltip()}),google.maps.event.addListener(this.googleMap,"projection_changed",function(){e.projection=e.googleMap.getProjection(),e.overlayView=new google.maps.OverlayView,e.overlayView.draw=function(){},e.overlayView.onAdd=function(e){},e.overlayView.setMap(e.googleMap)}),google.maps.event.addListener(this.googleMap,"rightclick",function(t){e.overlayView||google.maps.event.trigger(e.googleMap,"projection_changed");var n=e.currentFeature;n&&n.getProperties()&&n.getProperties().userCanEdit&&e.deleteNode(t)}),this.options.autoSaveMapType&&google.maps.event.addListener(this.googleMap,"maptypeid_changed",function(){e.saveMapType()})},komoo.Map.prototype.getVisibleFeatures=function(){var e=this.googleMap.getBounds();if(!e)return[];var t=komoo.collections.makeFeaturesCollection();return this.features.forEach(function(n,r,i){if(!n.getMap()&&n.getMarker()&&!n.getMarker().getVisible())return;n.getBounds()?e.intersects(n.getBounds())&&t.push(n):n.getPosition&&e.contains(n.getPosition())&&t.push(n)}),t},komoo.Map.prototype.saveLocation=function(e,t){var n=e||this.googleMap.getCenter(),r=t||this.googleMap.getZoom();komoo.utils.createCookie("lastLocation",n.toUrlValue(),90),komoo.utils.createCookie("lastZoom",r,90)},komoo.Map.prototype.goToSavedLocation=function(){var e=komoo.utils.readCookie("lastLocation"),t=parseInt(komoo.utils.readCookie("lastZoom"),10);if(e&&t){window.console&&console.log("Getting location from cookie..."),e=e.split(",");var n=new google.maps.LatLng(e[0],e[1]);return this.googleMap.setCenter(n),this.googleMap.setZoom(t),!0}return!1},komoo.Map.prototype.saveMapType=function(e){var t=e||this.googleMap.getMapTypeId();komoo.utils.createCookie("mapType",t,90)},komoo.Map.prototype.useSavedMapType=function(){var e=komoo.utils.readCookie("mapType");return e?(this.googleMap.setMapTypeId(e),!0):!1},komoo.Map.prototype.updateFeature=function(e,t){var n;if(!t){t=e;var e=t.features[0];e=this.getFeature(e.properties.type,e.properties.id)}t.type=="FeatureCollection"&&t.features?n=t.features[0].geometry:t.type=="GeometryCollection"&&t.geometries&&(n=t.geometries[0]),e.getGeometryType()==n.type&&e.setCoordinates(n.coordinates)},komoo.Map.prototype.getZoom=function(){return this.googleMap.getZoom()},komoo.Map.prototype.setZoom=function(e){return this.googleMap.setZoom(e)},komoo.Map.prototype.loadGeoJSON=function(e,t,n){var r=this,i,s=komoo.collections.makeFeatureCollection({map:this});n===undefined&&(n=!0);var o=$.extend({clickable:!0,editable:!1,zIndex:1},this.options.featureOptions),u=$.extend({clickable:!0,editable:!1,zIndex:3},this.options.featureOptions),a={};if(!e.type)return;if(e.type=="FeatureCollection")var f=e.features;var l;return f?(f.forEach(function(e,t,i){var o=e.geometry;l=r.getFeature(e.properties.type,e.properties.id),l||(l=komoo.features.makeFeature(e,r.featureOptions));var u=[];l&&(l=r.loadedFeatures[e.properties.type+"_"+e.properties.id]||l,r.loadedFeatures[l.getProperties().type+"_"+l.getProperties().id]||(r.features.push(l),r.loadedFeatures[l.getProperties().type+"_"+l.getProperties().id]=l,r._attachFeatureEvents(l)),s.push(l),n&&l.setMap(r),l.getMarker()&&(google.maps.event.addListener(l.getMarker(),"click",function(){}),r.clusterer&&l.getProperties().type=="Community"&&r.clusterer.push(l)),l.updateIcon())}),t&&l.getBounds()&&this.googleMap.fitBounds(l.getBounds()),this._emit_geojson_loaded(e),s):[]},komoo.Map.prototype.getBounds=function(){return this.googleMap.getBounds()},komoo.Map.prototype.getGeoJSON=function(e){var t=e||{},n,r=[],i,s=t.newOnly||!1,o=t.currentOnly||!1,u=t.geometryCollection||!1;return s?i=this.newFeatures:o?(i=komoo.collections.makeFeatureCollection({map:this}),i.push(this.currentFeature)):i=this.features,u?(n={type:"GeometryCollection",geometries:r},i.forEach(function(e,t,n){e.getGeoJsonGeometry()&&r.push(e.getGeoJsonGeometry())}),n):i.getGeoJson()},komoo.Map.prototype.getFeaturesByType=function(e,t,n){return this.features.getByType(e,t,n)},komoo.Map.prototype.showFeaturesByType=function(e,t,n){return this.getFeaturesByType(e,t,n).show()},komoo.Map.prototype.hideFeaturesByType=function(e,t,n){return this.getFeaturesByType(e,t,n).hide()},komoo.Map.prototype.hideFeatures=function(e){return e.hide()},komoo.Map.prototype.hideAllFeatures=function(){return this.features.hide()},komoo.Map.prototype.showFeatures=function(e){return e.show()},komoo.Map.prototype.showAllFeatures=function(){return this.features.show()},komoo.Map.prototype.clear=function(){this.loadedFeatures={},this.features.removeAllFromMap(),this.features.clear(),this.clusterer&&this.clusterer.clear()},komoo.Map.prototype.deleteNode=function(e){var t=6,n=this.googleMap.getProjection(),r=n.fromLatLngToPoint(e.latLng),i=this.currentFeature,s=512,o=-1,u=-1,a;if(i.getGeometry().getPaths)a=i.getGeometry().getPaths();else{if(!i.getGeometry().getPath)return!1;a=new google.maps.MVCArray([i.getGeometry().getPath()])}var f,l;a.forEach(function(e,t){for(var i=0;i<e.getLength();i++){var a=n.fromLatLngToPoint(e.getAt(i)),c=Math.sqrt(Math.pow(Math.abs(r.x-a.x),2)+Math.pow(Math.abs(r.y-a.y),2));c<s&&(s=c,o=i,u=t,f=e.getAt(i),l=e)}});var c=this.overlayView.getProjection(),h=c.fromLatLngToContainerPixel(e.latLng),p=c.fromLatLngToContainerPixel(f),d=Math.abs(p.x-h.x),v=Math.abs(p.y-h.y);return d<t&&v<t?(l.removeAt(o),l.getLength()==0&&a.removeAt(u),!0):!1},komoo.Map.prototype.setCurrentFeature=function(e,t){$("#komoo-map-add-button, #komoo-map-cut-out-button, #komoo-map-delete-button").hide(),this.currentFeature=e;if(this.currentFeature&&this.currentFeature.getProperties()&&this.currentFeature.getProperties().userCanEdit){this.currentFeature.setEditable(!0);var n=this.currentFeature.getGeometry();if(n.getGeometryType()=="Polygon")this.drawingMode_=komoo.GeometryType.POLYGON,$("#komoo-map-cut-out-button").show();else if(n.getGeometryType()=="LineString"||this.currentFeature.getGeometry().getGeometryType()=="MultiLineString")this.drawingMode_=komoo.GeometryType.POLYLINE;else if(n.getGeometryType()=="Point"||this.currentFeature.getGeometry().getGeometryType()=="MultiPoint")this.drawingMode_=komoo.GeometryType.POINT;$("#komoo-map-add-button, #komoo-map-delete-button").show()}},komoo.Map.prototype.setEditable=function(e){var t;this.editable=e,this.drawingManager||this._initDrawingManager(),e?(this.drawingManagerOptions.drawingMode=null,this.options.defaultDrawingControl&&(this.drawingManagerOptions.drawingControl=!0),this.setCurrentFeature(this.currentFeature),this.editToolbar&&this.editToolbar.show(),this.mainPanel&&this.mainPanel.show()):(this.drawingManagerOptions.drawingMode=null,this.options.defaultDrawingControl&&(this.drawingManagerOptions.drawingControl=!1),this.currentFeature&&this.currentFeature.setEditable&&this.currentFeature.setEditable(!1),this.editToolbar&&this.editToolbar.hide(),this.mainPanel&&this.mainPanel.hide(),this.setEditMode(null)),this.drawingManager&&this.drawingManager.setOptions(this.drawingManagerOptions)},komoo.Map.prototype.goToUserLocation=function(){var e=this,t;google.loader.ClientLocation&&(t=new google.maps.LatLng(google.loader.ClientLocation.latitude,google.loader.ClientLocation.longitude),this.googleMap.setCenter(t),window.console&&console.log("Getting location from Google...")),navigator.geolocation&&navigator.geolocation.getCurrentPosition(function(n){t=new google.maps.LatLng(n.coords.latitude,n.coords.longitude),e.googleMap.setCenter(t),window.console&&console.log("Getting location from navigator.geolocation...")},function(){window.console&&console.log("User denied access to navigator.geolocation...")})},komoo.Map.prototype.goTo=function(e,t){function i(e){e&&(n.googleMap.panTo(e),n.searchMarker||(n.searchMarker=new google.maps.Marker,n.searchMarker.setMap(n.googleMap)),t&&n.searchMarker.setPosition(e))}t==undefined&&(t=!0);var n=this,r;if(typeof e=="string"){var s={address:e,region:this.region};this.geocoder.geocode(s,function(e,t){if(t==google.maps.GeocoderStatus.OK){var n=e[0];r=n.geometry.location,i(r)}})}else e instanceof Array?r=new google.maps.LatLng(e[0],e[1]):r=e,i(r)},komoo.Map.prototype.panTo=function(e,t){return this.goTo(e,t)},komoo.Map.prototype.selectNewGeometryType=function(e,t){var n=this,r=[];return e.featureType.geometryTypes.forEach(function(i,s,o){r.push({text:gettext(i),"class":"button",click:function(){var r=komoo.geometries.makeGeometry({geometry:{type:i}},e);e.setGeometry(r),t&&(n.editFeature(e),n.setEditMode(komoo.EditMode.ADD),n.drawingManager.setDrawingMode(n.drawingMode[n.drawingMode_])),$(this).dialog("close")}})}),infoMessage("Geometry","Select the geometry type you want to draw",null,r)},komoo.Map.prototype.editFeature=function(e){if(!e||!e.getProperties()||!e.getProperties().userCanEdit)return!1;if(e.getGeometryType()=="Empty")return this.selectNewGeometryType(e,!0);e.setEditable(!0),e.setMap(this),this.type=e.getProperties("type"),this.setCurrentFeature(e,!0),this.setMode(komoo.Mode.DRAW),$(".map-panel-title",this.addPanel).text(gettext("Edit")),this.addPanel.css({"margin-top":"33px"}),this.addPanel.show();var t=this.featureOptions[e.getProperties().type].backgroundColor,n=this.featureOptions[e.getProperties().type].borderColor,r=this.featureOptions[e.getProperties().type].zIndex;return this.drawingManagerOptions.polylineOptions.strokeColor=n,this.drawingManagerOptions.polygonOptions.fillColor=t,this.drawingManagerOptions.polygonOptions.strokeColor=n,this.drawingManagerOptions.polygonOptions.zIndex=r,!0},komoo.Map.prototype._attachFeatureEvents=function(e){var t=this;e.getPaths&&e.setOptions({strokeWeight:1.5}),google.maps.event.addListener(e,"rightclick",function(e){var n=this;n.getProperties()&&n.getProperties().userCanEdit&&n==t.currentFeature&&(t.featureView||google.maps.event.trigger(t.googleMap,"projection_changed"),t.deleteNode(e))}),google.maps.event.addListener(e,"click",function(e,n){var r=this;window.console&&console.log("Clicked on feature");if(t.mode==komoo.Mode.SELECT_CENTER){t._emit_center_selected(e.latLng);return}if(t.addPanel.is(":visible")&&r!=t.currentFeature){window.console&&console.log("Clicked on unselected feature");if(!r.getProperties().userCanEdit)return}if(t.editMode==komoo.EditMode.DELETE&&r.getProperties()&&r.getProperties().userCanEdit){var i=0;if(r.getGeometryType()==komoo.GeometryType.POLYGON){var s=r.getGeometry().getPaths();i=s.getLength(),s.forEach(function(t,n){komoo.utils.isPointInside(e.latLng,t)&&(s.removeAt(n),i--)})}else if(r.getGeometryType()==komoo.GeometryType.MULTIPOINT){var o=r.getGeometry().getMarkers();i=o.getLength(),n&&o.forEach(function(e,t){e==n&&(o.removeAt(t),e.setMap(null),i--)})}i!==0&&t.setCurrentFeature(r),t.setEditMode(null),t._emit_changed()}else t.setEditMode(null),t.setCurrentFeature(r),t.closeTooltip(),setTimeout(function(){t.openInfoWindow({feature:r,position:e.latLng})},200)}),google.maps.event.addListener(e,"dblclick",function(e,t){e.stop();var n=this.getUrl();n&&(window.location=n)}),google.maps.event.addListener(e,"mousemove",function(n){clearTimeout(t.tooltip.timer);var r=e.getProperty("type")=="Community"?400:0;t.tooltip.timer=setTimeout(function(){t.openTooltip({feature:e,position:n.latLng})},r)}),google.maps.event.addListener(e,"mouseout",function(e){t.closeTooltip()})},komoo.Map.prototype.drawNew=function(e,t){this.setDrawingMode(t,e),this.event.trigger("drawing_started",[e,t])},komoo.Map.prototype.setDrawingMode=function(e,t){t||(t=e,e=this.type),this.type=e,this.setEditMode(komoo.EditMode.DRAW),this.setCurrentFeature(null),this.drawingMode_=this.drawingMode[t],this.drawingManager.setDrawingMode(this.drawingMode_);var n={};n[komoo.GeometryType.POLYGON]=gettext("Add shape"),n[komoo.GeometryType.POLYLINE]=gettext("Add line"),n[komoo.GeometryType.POINT]=gettext("Add point"),$(".map-panel-title",this.addPanel).text(n[t]);if(this.featureOptions[this.type]){var r=this.featureOptions[this.type].backgroundColor,i=this.featureOptions[this.type].borderColor,s=this.featureOptions[this.type].zIndex;this.drawingManagerOptions.polylineOptions.strokeColor=i,this.drawingManagerOptions.polygonOptions.fillColor=r,this.drawingManagerOptions.polygonOptions.strokeColor=i,this.drawingManagerOptions.polygonOptions.zIndex=s}},komoo.Map.prototype._initDrawingManager=function(){var e=this,t=google.maps.ControlPosition.TOP_LEFT;this.drawingManagerOptions={map:this.googleMap,drawingControl:!1,drawingControlOptions:{position:t,drawingModes:[komoo.GeometryType.POLYGON,komoo.GeometryType.POLYLINE,komoo.GeometryType.CIRCLE,komoo.GeometryType.POINT]},polygonOptions:$.extend({clickable:!0,editable:!1,zIndex:1},this.options.featureOptions),polylineOptions:$.extend({clickable:!0,editable:!1},this.options.featureOptions),circleOptions:{fillColor:"white",fillOpacity:.15,editable:!0,zIndex:-1},drawingMode:komoo.GeometryType.POLYGON},this.drawingManager=new google.maps.drawing.DrawingManager(this.drawingManagerOptions),google.maps.event.addListener(this.drawingManager,"overlaycomplete",function(t){var n;t.overlay.getPath&&(n=t.overlay.getPath());var r;if(e.editMode!=komoo.EditMode.CUTOUT&&e.editMode!=komoo.EditMode.ADD||!t.overlay.getPaths)e.editMode==komoo.EditMode.ADD&&t.overlay.getPosition?(e.currentFeature.getGeometry().addMarker(t.overlay),e.currentFeature.updateIcon(100),e.setEditMode(komoo.EditMode.DRAW)):e.editMode==komoo.EditMode.ADD&&t.overlay.getPath?(e.currentFeature.getGeometry().addPolyline(t.overlay,!0),e.setEditMode(komoo.EditMode.DRAW)):t.overlay.getPosition?(r=new MultiMarker,r.addMarker(t.overlay),r.setMap(e.googleMap)):t.overlay.getPath&&!t.overlay.getPaths?(r=new MultiPolyline,r.addPolyline(t.overlay,!0),r.setMap(e.googleMap)):r=t.overlay;else{var i=e.currentFeature.getGeometry().getPaths();if(i.length>0){var s=google.maps.geometry.spherical.computeSignedArea(n),o=google.maps.geometry.spherical.computeSignedArea(i.getAt(0)),u=s/Math.abs(s),a=o/Math.abs(o);if(u==a&&e.editMode==komoo.EditMode.CUTOUT||u!=a&&e.editMode==komoo.EditMode.ADD)n=new google.maps.MVCArray(n.getArray().reverse())}i.push(n),e.currentFeature.getGeometry().setPaths(i),t.overlay.setMap(null),e.setEditMode(komoo.EditMode.DRAW)}if(r){var f=komoo.features.makeFeature({properties:{userCanEdit:!0,type:e.type,name:"sem nome",alwaysVisible:!0},geometry:{type:e.drawingManager.getDrawingMode()}}),l=e.featureOptions[e.type];l&&f.setFeatureType(l);var c=f.getGeometry();c.setOverlay(r),f.setMap(e,{geometry:!0}),f.updateIcon(e.googleMap.getZoom()),e.features.push(f),e.newFeatures.push(f),e._attachFeatureEvents(f),e.setCurrentFeature(f),e.setEditMode(komoo.EditMode.DRAW)}return n&&(google.maps.event.addListener(n,"set_at",function(){e._emit_changed()}),google.maps.event.addListener(n,"insert_at",function(){e._emit_changed()})),e.drawingManager.setDrawingMode(null),e._emit_changed(),!0});if(!this.options.defaultDrawingControl){this.addItems=$("<div>");var n=komoo.createMapButton(gettext("Add"),gettext("Add another region"),function(t){e.editMode==komoo.EditMode.ADD?e.setEditMode(komoo.EditMode.DRAW):e.setEditMode(komoo.EditMode.ADD),e.drawingManager.setDrawingMode(e.drawingMode[e.drawingMode_])});n.hide(),n.attr("id","komoo-map-add-button"),this.editToolbar.append(n);var r=komoo.createMapButton(gettext("Cut out"),gettext("Cut out a hole from a region"),function(t){e.editMode==komoo.EditMode.CUTOUT?e.setEditMode(komoo.EditMode.DRAW):e.setEditMode(komoo.EditMode.CUTOUT),e.drawingManager.setDrawingMode(e.drawingMode[e.drawingMode_])});r.hide(),r.attr("id","komoo-map-cut-out-button"),this.editToolbar.append(r);var i=komoo.createMapButton(gettext("Delete"),gettext("Delete a region"),function(t){e.editMode==komoo.EditMode.DELETE?e.setEditMode(komoo.EditMode.DRAW):e.setEditMode(komoo.EditMode.DELETE),e.drawingManagerOptions.drawingMode=null,e.drawingManager.setOptions(e.drawingManagerOptions)});i.hide(),i.attr("id","komoo-map-delete-button"),this.editToolbar.append(i),this.event.bind("editmode_changed",function(t,s){e.closeInfoWindow(),e.closeTooltip(),n.removeClass("active"),r.removeClass("active"),i.removeClass("active"),s=="add"?n.addClass("active"):s=="cutout"?r.addClass("active"):s=="delete"&&i.addClass("active")})}},komoo.Map.prototype.setMode=function(e){this.mode=e,this.mode!=komoo.Mode.DRAW&&this.setEditMode(komoo.EditMode.NONE),this.event.trigger("mode_changed",e)},komoo.Map.prototype.setEditMode=function(e){this.editMode=e,this.editMode!=komoo.EditMode.NONE&&this.mode!=komoo.Mode.DRAW&&this.setMode(komoo.Mode.DRAW),this.event.trigger("editmode_changed",e)},komoo.Map.prototype.selectCenter=function(e,t){var n=this;this.setMode(komoo.Mode.SELECT_CENTER);var r=function(i,s,o){typeof e=="number"&&o.setRadius(e),typeof t=="function"&&t(s,o),n.event.unbind("center_selected",r)};this.event.bind("center_selected",r)},komoo.Map.prototype.getFeature=function(e,t){return this.loadedFeatures[e+"_"+t]},komoo.Map.prototype.centerFeature=function(e,t){var n;return typeof e=="string"&&(n=e,e=this.getFeature(n,t)),e?(this.panTo(e.getCenter(),!1),!0):!1},komoo.Map.prototype.highlightFeature=function(e,t){var n;return typeof e=="string"&&(n=e,e=this.getFeature(n,t)),e?e.isHighlighted()?!0:(this.featureHighlighted&&this.featureHighlighted.setHighlight(!1),e.setHighlight(!0),this.closeInfoWindow(),this.openInfoWindow({feature:e,position:e.getCenter()}),this.featureHighlighted=e,!0):!1},komoo.Map.prototype._emit_geojson_loaded=function(e){this.clusterer&&this.clusterer.repaint(),this.event.trigger("geojson_loaded",e)},komoo.Map.prototype._emit_mapclick=function(e){this.event.trigger("mapclick",e)},komoo.Map.prototype._emit_featureclick=function(e){this.event.trigger("featureclick",e)},komoo.Map.prototype._emit_center_selected=function(e){var t=this;this.radiusCircle||(this.radiusCircle=new google.maps.Circle({visible:!0,radius:100,fillColor:"white",fillOpacity:0,strokeColor:"#ffbda8",zIndex:-1}),google.maps.event.addListener(this.radiusCircle,"click",function(e){t.mode==komoo.Mode.SELECT_CENTER&&t._emit_center_selected(e.latLng)}),this.radiusCircle.setMap(this.googleMap)),this.centerMarker||(this.centerMarker=new google.maps.Marker({visible:!0,icon:"/static/img/marker.png",zIndex:4}),this.centerMarker.setMap(this.googleMap)),this.centerMarker.setPosition(e),this.radiusCircle.setCenter(e),this.event.trigger("center_selected",[e,this.radiusCircle]),this.setMode(komoo.Mode.NAVIGATE)},komoo.Map.prototype._emit_changed=function(e){this.event.trigger("changed",e)},komoo.createMapButton=function(e,t,n){var r=$("<div>").text(e).addClass("map-button");return r.attr("title",t),r.bind("click",n),r},komoo.Map.prototype._createMainPanel=function(){var e=this;this.options.featureTypes.forEach(function(t,n,r){e.featureOptions[t.type]=t}),google.maps.event.addListener(this.drawingManager,"drawingmode_changed",function(t){e.drawingManager.drawingMode&&e.addPanel.show()})},komoo.Map.prototype._createClosePanel=function(){var e=this,t=$("<div>").addClass("map-panel"),n=$("<div>").addClass("content"),r=$("<div>").addClass("map-panel-buttons"),i=$("<div>").addClass("map-button");return i.append($("<i>").addClass("icon-remove")),i.append($("<span>").text(gettext("Close"))),n.css({clear:"both"}),r.css({clear:"both"}),t.append(n),t.append(r),r.append(i),t.css({margin:"10px",width:"220px"}),i.click(function(t){e.event.trigger("close_click")}),t.hide()},komoo.Map.prototype._createAddPanel=function(){function u(){e.drawingManager.setDrawingMode(null),e.setMode(komoo.Mode.NAVIGATE),t.hide(),e.event.trigger("drawing_finished")}var e=this,t=$("<div>").addClass("map-panel"),n=$("<div>").addClass("content"),r=$("<div>").text(gettext("Title")).addClass("map-panel-title"),i=$("<div>").addClass("map-panel-buttons"),s=$("<div>").text(gettext("Finish")).addClass("map-button"),o=$("<div>").text(gettext("Cancel")).addClass("map-button");return o.bind("click",function(){u(),e.newFeatures.length>0&&(e.newFeatures.forEach(function(t,n,r){var i=e.features.pop();i.removeFromMap()}),e.newFeatures.clear()),e.event.trigger("cancel_click"),e.type=null,e.setEditMode(undefined)}),s.bind("click",function(){u(),e.event.trigger("finish_click",e.featureOptions[e.type]),e.type=null,e.setEditMode(undefined)}),n.css({clear:"both"}),i.css({clear:"both"}),n.append(this.editToolbar),t.append(r),t.append(n),t.append(i),i.append(s),i.append(o),t.css({margin:"10px",width:"220px"}),t.hide()}
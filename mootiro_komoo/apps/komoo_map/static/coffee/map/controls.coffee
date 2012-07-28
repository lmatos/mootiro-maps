window.komoo ?= {}
window.komoo.event ?= google.maps.event


class DrawingManager
    defaultDrawingManagerOptions:
        drawingControl: false
        drawingMode: null

    constructor: (@options = {}) ->
        @options.drawingManagerOptions ?= @defaultDrawingManagerOptions
        if @options.map
            @setMap @options.map

    initManager: (options = @defaultDrawingManagerOptions) ->
        @manager = new google.maps.drawing.DrawingManager options

    setMap: (@map) ->
        @options.drawingManagerOptions.map = @map.googleMap
        @initManager @options.drawingManagerOptions

class Balloon
    defaultWidth: "300px"
    enabled: on

    constructor: (@options = {}) ->
        @width = @options.width or @defaultWidth
        @createInfoBox @options
        if @options.map
            @setMap @options.map
        @customize()

    createInfoBox: (options) ->
        @setInfoBox new InfoBox
            pixelOffset: new google.maps.Size(0, -20)
            enableEventPropagation: true
            closeBoxMargin: "10px"
            disableAutoPan: true
            boxStyle:
                cursor: "pointer"
                background: "url(/static/img/infowindow-arrow.png) no-repeat 0 10px"
                width: @width

    setInfoBox: (@infoBox) ->

    setMap: (@map) ->
        @handleMapEvents()

    enable: -> @enabled = on

    disable: ->
        @close()
        @enabled = off

    open: (@options = {}) ->
        if not @enabled then return
        @setContent options.content or \
            if options.features
                @createClusterContent options
            else
                @createFeatureContent options
        @feature = options.feature ? options.features?.getAt 0
        position = options.position ? @feature.getCenter()
        point = komoo.utils.latLngToPoint @map, position
        point.x += 5
        newPosition = komoo.utils.pointToLatLng @map, point
        @infoBox.setPosition newPosition
        @infoBox.open(@map.googleMap ? @map)

    setContent: (content = title: "", body: "") ->
        if typeof content is "string"
            content =
                title: ""
                url: ""
                body: content
        @title.html \
            if content.url
                "<a href=\"#{content.url}\">#{content.title}</a>"
            else
                content.title
        @body.html content.body

    close: ->
        @isMouseover = false
        @infoBox.close()
        if @feature?.isHighlighted()
            @feature.setHighlight off
        @feature = null

    customize: ->
        google.maps.event.addDomListener @infoBox, "domread", (e) =>
            div = @infoBox.div_
            google.maps.event.addDomListener div, "click", (e) =>
                e.cancelBubble = true
                e.stopPropagation?()
            google.maps.event.addDomListener div, "mouseout", (e) =>
                @isMouseover = false


            komoo.event.trigger @, "domready"

        @initDomElements()

    initDomElements: ->
        @title = $("<div>")
        @body = $("<div>")
        @content = $("<div>").addClass "map-infowindow-content"
        @content.append @title
        @content.append @body
        @content.css {
            background: "white"
            padding: "10px"
            margin: "0 0 0 15px"
        }
        @content.hover \
            (e) => @isMouseover = true,
            (e) => @isMouseover = false
        @infoBox.setContent @content.get(0)

    createClusterContent: (options = {}) ->
        features = options.features or []
        msg = ngettext "%s Community", "%s Communities", features.length
        title = "<strong>#{interpolate msg, [features.length]}</strong>"
        body = for feature in features[0..10]
            "<li>#{feature.getProperty 'name'}</li>"
        body = "<ul>#{body.join('')}</ul>"
        title: title, url: "", body: body

    createFeatureContent: (options = {}) ->
        title = ""
        feature = options.feature
        if feature
            title =
                if feature.getProperty("type") is "OrganizationBranch"
                    feature.getProperty("organization_name") + " - " + + \
                    feature.getProperty("name") \
                        " - " + feature.getProperty("name")
                else
                    feature.getProperty "name"
        title: title, url: "", body: ""


class AjaxBalloon extends Balloon
    createFeatureContent: (options = {}) ->
        feature = options.feature

        if not feature then return
        if feature[@contentViewName] then return feature[@contentViewName]

        url = dutils.urls.resolve @contentViewName,
            zoom: @map.getZoom()
            app_label: feature.featureType.appLabel
            model_name: feature.featureType.modelName
            obj_id: feature.getProperty "id"

        $.get url, (data) =>
            feature[@contentViewName] = data
            @setContent data

        gettext "Loading..."


class InfoWindow extends AjaxBalloon
    defaultWidth: "350px"
    contentViewName: "info_window"

    open: (options) ->
        @feature?.displayTooltip = on
        super options
        @feature.displayTooltip = off

    close: ->
        @feature.displayTooltip = on
        @map.enableComponents 'tooltip'
        super()

    customize: ->
        super()
        google.maps.event.addDomListener @infoBox, "domready", (e) =>
            div = @content.get 0
            closeBox = @infoBox.div_.firstChild

            google.maps.event.addDomListener div, "mousemove", (e) =>
                @map.disableComponents 'tooltip'

            google.maps.event.addDomListener div, "mouseout", (e) =>
                closeBox = @infoBox.div_.firstChild
                if e.toElement isnt closeBox
                    @map.enableComponents 'tooltip'

            google.maps.event.addDomListener closeBox, "click", (e) =>
                @close()

    handleMapEvents: ->
        komoo.event.addListener @map, 'feature_click', (e, feature) =>
            setTimeout =>
                @open feature: feature, position: e.latLng
            , 200


class Tooltip extends AjaxBalloon
    contentViewName: "tooltip"

    close: ->
        clearTimeout @timer
        super()

    customize: ->
        super()
        google.maps.event.addDomListener @infoBox, "domready", (e) =>
            div = @infoBox.div_
            google.maps.event.addDomListener div, "click", (e) =>
                e.latLng = @infoBox.getPosition()
                komoo.event.trigger @map, 'feature_click', e, @feature
            closeBox = div.firstChild
            $(closeBox).hide()

    handleMapEvents: ->
        komoo.event.addListener @map, 'feature_mousemove', (e, feature) =>
            clearTimeout @timer

            if feature is @feature or not feature.displayTooltip then return

            delay = if feature.getType() is 'Community' then 400 else 10
            @timer = setTimeout =>
                if not feature.displayTooltip then return
                @open feature: feature, position: e.latLng
            , delay

        komoo.event.addListener @map, 'feature_mouseout', (e, feature) =>
            @close()

        komoo.event.addListener @map, 'feature_click', (e, feature) =>
            @close()

        komoo.event.addListener @map, 'cluster_mouseover',  (features, position) =>
            if not features.getAt(0).displayTooltip then return
            @open features: features, position: position

        komoo.event.addListener @map, 'cluster_mouseout', (e, feature) =>
            @close()

        komoo.event.addListener @map, 'cluster_click', (e, feature) =>
            @close()


class FeatureClusterer
    maxZoom: 9
    gridSize: 20
    minSize: 1
    imagePath: '/static/img/cluster/communities'
    imageSizes: [24, 29, 35, 41, 47]

    constructor: (@options = {}) ->
        @options.gridSize ?= @gridSize
        @options.maxZoom ?= @maxZoom
        @options.minimumClusterSize ?= @minSize
        @options.imagePath ?= @imagePath
        @options.imageSizes ?= @imageSizes
        @featureType = @options.featureType
        @features = []
        if @options.map
            @setMap @options.map

    initMarkerClusterer: (options = {}) ->
        map = @map?.googleMap or @map
        @clusterer = new MarkerClusterer map, [], options

    initEvents: (object = @clusterer) ->
        if not object then return

        eventsNames = ['clusteringbegin', 'clusteringend']
        eventsNames.forEach (eventName) =>
            komoo.event.addListener object, eventName, (mc) =>
                komoo.event.trigger @, eventName, @

        eventsNames = ['click', 'mouseout', 'mouseover']
        eventsNames.forEach (eventName) =>
            komoo.event.addListener object, eventName, (c) =>
                features = komoo.collections.makeFeatureCollection \
                    features: (marker.feature for marker in c.getMarkers())
                komoo.event.trigger @, eventName, features, c.getCenter()
                komoo.event.trigger @map, "cluster_#{eventName}", features, c.getCenter()

    setMap: (@map) ->
        @initMarkerClusterer @options
        @initEvents()
        @addFeatures @map.getFeatures()
        @handleMapEvents()

    handleMapEvents: ->
        komoo.event.addListener @map, 'feature_created', (feature) =>
            if feature.getType() is @featureType
                @push feature

    updateLength: -> @length = @features.length

    clear: ->
        @features = []
        @clusterer.clearMarkers()
        @updateLength()

    getAt: (index) -> @features[index]

    push: (element) ->
        if element.getMarker()
            @features.push element
            element.getMarker().setVisible off
            @clusterer.addMarker element.getMarker().getOverlay()
            @updateLength()

    pop: ->
        element = @features.pop()
        @clusterer.removeMarker element.getMarker()
        @updateLength()
        element

    forEach: (callback, thisArg) ->
        @features.forEach callback, thisArg

    repaint: -> @clusterer.repaint()

    getAverageCenter: -> @clusterer.getAverageCenter()

    addFeatures: (features) ->
        features?.forEach (feature) => @push(feature)


class Box
    position: google.maps.ControlPosition.RIGHT_BOTTOM
    constructor: ->
        @box = $ "<div>"
        if @id? then @box.attr "id", @id

    setMap: (@map) ->
        @map.googleMap.controls[@position].push @box.get 0


class SupporterBox extends Box
    id: "map-supporters"

    constructor: ->
        super()
        @box.append $("#map-supporters-content").show()


class LicenseBox extends Box
    id: "map-license"
    position: google.maps.ControlPosition.BOTTOM_LEFT

    constructor: ->
        super()
        @box.html 'Este conteúdo é disponibilizado nos termos da licença <a href="http://creativecommons.org/licenses/by-sa/3.0/deed.pt_BR">Creative Commons - Atribuição - Partilha nos Mesmos Termos 3.0 Não Adaptada</a>; pode estar sujeito a condições adicionais. Para mais detalhes, consulte as Condições de Uso.'


window.komoo.controls =
    DrawingManager: DrawingManager
    Balloon: Balloon
    AjaxBalloon: AjaxBalloon
    InfoWindow: InfoWindow
    Tooltip: Tooltip
    FeatureClusterer: FeatureClusterer
    SupporterBox: SupporterBox
    LicenseBox: LicenseBox
    makeDrawingManager: (options) -> new DrawingManager options
    makeInfoWindow: (options) -> new InfoWindow options
    makeTooltip: (options) -> new Tooltip options
    makeFeatureClusterer: (options) -> new FeatureClusterer options
    makeSupporterBox: (options) -> new SupporterBox options
    makeLicenseBox: (options) -> new LicenseBox options

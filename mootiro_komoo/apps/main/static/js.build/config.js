(function(){var e;e={baseUrl:"/static/js",paths:{lib:"../lib","ad-gallery":"../ad_gallery/jquery.ad-gallery.min",jquery:"../lib/jquery-1.7.1.min",underscore:"../lib/underscore-min",backbone:"../lib/backbone-min",async:"../lib/requirejs/async",goog:"../lib/requirejs/goog",propertyParser:"../lib/requirejs/propertyParser"},shim:{underscore:{exports:"_"},backbone:{deps:["underscore","jquery"],exports:"Backbone"}},deps:["map/compat","map/utils"]},typeof requirejs!="undefined"&&requirejs!==null&&requirejs.config(e),window.require==null&&(window.require=e)}).call(this)
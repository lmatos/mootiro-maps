(function(){var e=Object.prototype.hasOwnProperty,t=function(t,n){function i(){this.constructor=t}for(var r in n)e.call(n,r)&&(t[r]=n[r]);return i.prototype=n.prototype,t.prototype=new i,t.__super__=n.prototype,t};define(["googlemaps"],function(e){var n,r,i,s,o;return window.komoo==null&&(window.komoo={}),(o=window.komoo).event==null&&(o.event=e.event),i=function(){function e(e){this.options=e!=null?e:{},this.elements=[],this.length=0}return e.prototype.updateLength=function(){return this.length=this.elements.length},e.prototype.clear=function(){return this.elements=[],this.updateLength()},e.prototype.getAt=function(e){return this.elements[e]},e.prototype.push=function(e){return this.elements.push(e),this.updateLength()},e.prototype.pop=function(){var e;return e=this.elements.pop(),this.updateLength(),e},e.prototype.forEach=function(e,t){return this.elements.forEach(e,t)},e.prototype.getArray=function(){return this.elements},e.prototype.slice=function(e,t){return this.elements.slice(e,t)},e}(),n=function(n){function r(e){var t,n=this;e==null&&(e={}),r.__super__.constructor.call(this,e),e.map&&this.setMap(e.map),(t=e.features)!=null&&t.forEach(function(e){return n.push(e)})}return t(r,n),r.prototype.push=function(e){if(e==null)return;return r.__super__.push.call(this,e),e.setMap(this.map)},r.prototype.getBounds=function(){var t,n,r,i=this;return t=this.getAt(0),t&&t.getGeometryType()!=="Empty"&&(n=t.getGeometry(),r=n.getLatLngFromArray(n.getCenter()),this.bounds=new e.LatLngBounds(r,r),this.forEach(function(e){var t;return(t=i.bounds)!=null?t.union(e.getBounds()):void 0})),this.bounds},r.prototype.setMap=function(e,t){var n,r=this;return this.map=e,n=null,this.forEach(function(e){return t!=null&&(n={geometry:t!=null?t.geometry:void 0,point:t!=null?t.icon:void 0,icon:t!=null?t.icon:void 0}),e.getType()==="Community"&&n!=null&&(n.point=!1),e!=null?e.setMap(r.map,n):void 0}),this.handleMapEvents()},r.prototype.show=function(){return this.setMap(this.map,{geometry:!0}),this.setVisible(!0)},r.prototype.hide=function(){return this.setVisible(!1)},r.prototype.getGeoJson=function(e){var t;return e.geometryCollection==null&&(e.geometryCollection=!1),e.geometryCollection?(t={type:"GeometryCollection",geometries:[]},this.forEach(function(e){return t.geometries.push(e.getGeometryGeoJson())})):(t={type:"FeatureCollection",features:[]},this.forEach(function(e){return t.features.push(e.getGeoJson())})),t},r.prototype.removeAllFromMap=function(){return this.forEach(function(e){return e.removeFromMap()})},r.prototype.setVisible=function(e){return this.forEach(function(t){return t.setVisible(e)})},r.prototype.updateFeaturesVisibility=function(){return this.forEach(function(e){return e.seMap(e.getMap())})},r.prototype.handleMapEvents=function(){var e=this;return komoo.event.addListener(this.map,"zoom_changed",function(){})},r}(i),r=function(e){function r(e){e==null&&(e={}),r.__super__.constructor.call(this,e),this.featuresByType={}}return t(r,e),r.prototype.push=function(e){var t,i,s,o,u,a,f,l=this;return r.__super__.push.call(this,e),t=e.getType(),(i=this.featuresByType)[t]==null&&(i[t]={}),(s=this.featuresByType[t])["categories"]==null&&(s.categories={}),(o=this.featuresByType[t]["categories"])["all"]==null&&(o.all=new n({map:this.map})),(u=this.featuresByType[t]["categories"])["uncategorized"]==null&&(u.uncategorized=new n({map:this.map})),(f=e.getCategories())!=null&&f.forEach(function(r){var i,s;return(i=l.featuresByType[t]["categories"])[s=r.name]==null&&(i[s]=new n({map:l.map})),l.featuresByType[t].categories[r.name].push(e)}),(e.getCategories()==null||e.getCategories().length===0)&&this.featuresByType[t].categories.uncategorized.push(e),this.featuresByType[t].categories.all.push(e),(a=this.featuresByType[t])["ids"]==null&&(a.ids={}),this.featuresByType[t].ids[e.getProperty("id")]=e},r.prototype.pop=function(){return r.__super__.pop.call(this)},r.prototype.clear=function(){return this.featuresByType={},r.__super__.clear.call(this)},r.prototype.getByType=function(e,t,r){var i,s=this;return r==null&&(r=!1),this.featuresByType[e]?t?t.length===0?this.featuresByType[e].categories.uncategorized:(i=new n({map:this.map}),t.forEach(function(t){if(s.featuresByType[e].categories[t])return s.featuresByType[e].categories[t].forEach(function(e){if(!r||!e.getCategories()||e.getCategories().length===1)return i.push(e)})}),i):this.featuresByType[e].categories.all:!1},r.prototype.getById=function(e,t){var n;return(n=this.featuresByType[e])!=null?n.ids[t]:void 0},r.prototype.highlightFeature=function(e,t){var n,r;n=typeof e=="string"?this.getById(e,t):e;if(n.isHighlighted())return;return(r=this.highlighted)!=null&&r.setHighlight(!1),n.highlight(),this.highlighted=n},r}(n),s=function(e){function n(){n.__super__.constructor.apply(this,arguments)}return t(n,e),n}(n),window.komoo.collections={GenericCollection:i,FeatureCollection:n,FeatureCollectionPlus:r,makeFeatureCollection:function(e){return e==null&&(e={}),new n(e)},makeFeatureCollectionPlus:function(e){return e==null&&(e={}),new r(e)}},window.komoo.collections})}).call(this)
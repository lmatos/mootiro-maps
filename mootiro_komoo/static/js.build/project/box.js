(function(){define(["jquery","underscore","backbone","project/add_dialog","text!templates/project/_box.html","utils"],function(e,t,n,r,i){var s,o;return o=n.View.extend({tagName:"li",initialize:function(){return t.bindAll(this,"render"),this.model.bind("change",this.render,this),this.model.bind("destroy",this.remove,this)},render:function(){return this.$el.html('<a href="'+this.model.get("view_url")+'">'+this.model.get("name")+"</a>"),this}}),s=n.View.extend({className:"project_box",events:{"click .add":"onAddBtnClick"},initialize:function(){var e,n,s=this;return t.bindAll(this,"render"),this.template=t.template(i),(e=this.collection)!=null&&e.bind("add",this.addOne,this),(n=this.collection)!=null&&n.bind("reset",this.render,this),this.addDialog=(new r({model:this.model})).render(),this.addDialog.on("saved",function(e){return flash("Adicionado ao projeto "+e.get("name")),s.collection.add(e),s.addDialog.close()}),this.addDialog.on("failed",function(e,t){return flash("Falhou ao adicionar ao projeto "+e.get("name")+": "+t)})},addOne:function(e){var t;return t=new o({model:e}),this.$(".list").append(t.render().el)},addAll:function(){var e,t=this;return(e=this.collection)!=null?e.each(function(e){return t.addOne(e)}):void 0},openAddDialog:function(){return this.addDialog.open()},onAddBtnClick:function(){return this.openAddDialog(),!1},render:function(){var e;return e=this.template({projects:this.collection}),this.$el.html(e),this.addAll(),this}}),s})}).call(this)
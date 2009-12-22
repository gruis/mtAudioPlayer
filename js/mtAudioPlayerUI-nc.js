var mtAudioPlayerUI = new Class({
  Implements : [Options, Events],
  options : {
      id        : false,
      "class"   : "mtAPlayerUI",
      parent    : null,
      player    : null
  },
  elems         : $H({}),
  buttons       : $H({}),
  toElement   : function(){ return this.element; },
  initialize  : function(ops){
    this.setOptions(ops);

    if(this.options.parent == null)
      this.options.parent = document.body;

    this.options.id   = this.options.id ? this.options.id : "mtaudioui-"+ Math.floor(Math.random()*1000000000).toString(16)

    if(typeof this.options.player != "object")
      throw("A valid mtAudioPlayer object is requried");

    this.player = this.options.player;



    this.element            = new Element('div', { id : this.options.id, "class" : this.options["class"] });

    this.buttons.toggle       = new Element("a", { id : this.options.id+'_toggle', html : "play" , href : "#", "class" : "button toggle" } );
    this.buttons.prev         = new Element("a", {id : this.options.id+'_prev', html : "&laquo;" , href : "#", "class" : "button prev" });
    this.buttons.rw           = new Element("a", {id : this.options.id+'_rw', html : "&larr;" , href : "#", "class" : "rw" });
    this.buttons.stop         = new Element("a", {id : this.options.id+'_stop', html : "&curren;" , href : "#", "class" : "button stop" });
    this.buttons.ff           = new Element("a", {id : this.options.id+'_ff', html : "&rarr;" , href : "#", "class" : "ff" });
    this.buttons.next         = new Element("a", {id : this.options.id+'_next', html : "&raquo;" , href : "#", "class" : "button next" });

    this.readout              = new Element("div", { id : this.options.id+'_read', "class" : "readout" });
    this.pos                  = new Element("span", {id : this.options.id+'_pos', html : "0:00" , href : "#", "class" : "pos" });
    this.name                 = new Element("span", {id : this.options.id+'_name', html : "" , href : "#", "class" : "name" });
    this.dur                  = new Element("span", {id : this.options.id+'_dur', html : "0:00" , href : "#", "class" : "dur" });
    this.readout.adopt([this.pos,this.name,this.dur]);
    this.element.adopt(this.buttons.getValues()).adopt(this.readout);
    
    this.addEvents();
  },
  addEvents: function(){
        var my = this;
        this.buttons.toggle.addEvent("click", function(e){
            e.stop();
            var was = my.player.toggle();
            my.buttons.toggle.set("html", was);
            my.buttons.toggle.addClass(was);
            my.buttons.toggle.removeClass((was == "play") ? "pause" : "play");
            
        });
        this.buttons.stop.addEvent("click", function(e){
            e.stop();
            my.player.stop();
            my.buttons.toggle.set("html", "play");
            $clear(this.updateTimer);
        });
        this.buttons.next.addEvent("click", function(e){
            e.stop();
            my.player.next();
        });
        this.buttons.prev.addEvent("click", function(e){
            e.stop();
            my.player.prev();
        });
        
        my.player.addEvent("playing", function(track){
            my.buttons.toggle.set("html", "pause");
            my.updateTimer = my.updatePos.periodical(1000, my);
            my.dur.set("html", my.formatTime(my.player.duration));
            my.name.set("html",my.formatName(track));
        });
        

  },
  formatName : function(f){
      f =  f.substring(0,f.lastIndexOf("."));

      if(f.indexOf("/"))
          return f.substring(f.indexOf("/") + 1);          

      return f;

  },
  formatTime : function(s){
      s = s.round();
      var m = (s / 60).floor();
          s = (s % 60);
          s = s < 10 ? "0"+s : s;

      return m + ":" + s;
  },
  updatePos : function(){
      this.pos.set("html",this.formatTime(this.player.getPosition()));
  },
  inject : function(){
    $(this.options.parent).adopt(this.element);
    
    return this;
  }
});


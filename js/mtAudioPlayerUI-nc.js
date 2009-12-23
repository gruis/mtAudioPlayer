var mtAudioPlayerUI = new Class({
  Implements : [Options, Events],
  options : {
      id            : false,
      "class"       : "mtAPlayerUI",
      parent        : null,
      player        : null,
      shrinkable    : true,
      shrunkHeight  : 1,
      grownHeight   : 52,
      buttonElems   : {
          toggle       : new Element("a", { html : "play" , href : "#", "class" : "button toggle" } ),
          prev         : new Element("a", { html : "&laquo;" , href : "#", "class" : "button prev" }),
          /*rw           : new Element("a", { html : "&larr;" , href : "#", "class" : "rw" }),*/
          stop         : new Element("a", { html : "&curren;" , href : "#", "class" : "button stop" }),
          /*ff           : new Element("a", { html : "&rarr;" , href : "#", "class" : "ff" }),*/
          next         : new Element("a", { html : "&raquo;" , href : "#", "class" : "button next" }),
          mute         : new Element("a", { html : "mute" , href : "#", "class" : "button mute" })
      },
      readoutElems   : {
          pos           : new Element("span", { html : "0:00" , href : "#", "class" : "pos" }),
          name          : new Element("span", { html : "" , href : "#", "class" : "name" }),
          dur           : new Element("span", { html : "0:00" , href : "#", "class" : "dur" })
      },
      includeProgressBar : true
      
      
  },
  elems         : $H({}),
  buttons       : $H({}),
  shrunk        : false,
  toElement   : function(){ return this.element; },
  initialize  : function(ops){
    this.setOptions(ops);

    if(this.options.parent == null)
      this.options.parent = document.body;

    this.options.id   = this.options.id ? this.options.id : "mtaudioui-"+ Math.floor(Math.random()*1000000000).toString(16)

    if(typeof this.options.player != "object")
      throw("A valid mtAudioPlayer object is requried");

    this.player             = this.options.player;
    this.buttonElems        = $H(this.options.buttonElems);
    this.readoutElems       = $H(this.options.readoutElems);

    this.element            = new Element('div', { id : this.options.id, "class" : this.options["class"] });


    this.buttons              = new Element("div", { id : this.options.id+'_buttons', "class" : "buttons" });
        this.buttons.adopt(this.buttonElems.getValues());
        
    this.readout              = new Element("div", { id : this.options.id+'_read', "class" : "readout" });
        this.readout.adopt(this.readoutElems.getValues());
            

    this.element.adopt([this.buttons,this.readout]);
    
    this.buffBar = new Element("div", { "class" : "buff-bar" });
    this.buffBox = new Element("div", { "class" : "buff-box" });
        this.buffBox.adopt(this.buffBar);
        
    this.progBox = new Element("div", { "class" : "prog-box" });
    this.progBar = new Element("div", { "class" : "prog-bar" });
        this.progBox.adopt(this.progBar);

    this.element.adopt([this.buffBox, this.progBox]);

    
    this.addEvents();
    
    
  },
  addEvents: function(){
        var my = this;
        if(this.buttonElems.toggle){
            this.buttonElems.toggle.addEvent("click", my.player.toggle.bind(this.player));            
        }
        
        if(this.buttonElems.stop){
            this.buttonElems.stop.addEvent("click", function(e){
                    e.stop();
                    my.player.stop();
                    my.buttonElems.toggle.set("html", "play");
                    $clear(this.updateTimer);
            });            
        }
        
        if(this.buttonElems.next){
            this.buttonElems.next.addEvent("click", this.player.next.bind(this.player) );
        }
        
        if(this.buttonElems.prev){
            this.buttonElems.prev.addEvent("click", this.player.prev.bind(this.player) );
        }
        
        if(this.buttonElems.mute){
            this.buttonElems.mute.addEvent("click", function(){
                if(my.player.mute().muted){
                    my.buttonElems.mute.set("html", "unmute");
                } else{
                    my.buttonElems.mute.set("html", "mute");
                }

            });
        }

        
        this.player.addEvent("play", this.play.bind(this) );
        this.player.addEvent("pause", this.pause.bind(this) );
        this.player.addEvent("buffered", function(track, end){
            if(track.file == this.player.getTrack().file){
                var bw = this.buffBox.getStyle("width").toInt();
                var w = (end / this.player.getDuration()) * bw;
                    w = w > bw ? bw : w;
                this.buffBar.setStyle("width", w)
            }
        }.bind(this));
        
        this.progBox.addEvent("click", function(e){
            var s = this.player.getDuration() * ((e.page.x - this.progBox.getPosition().x) / (this.progBox.getStyle("width").toInt() / 100) / 100);
            this.player.seek(s);
            dbug.log("progBox: " + s);
        }.bind(this));
        this.progBar.addEvent("click", function(e){
            var s = this.player.getDuration() * ((e.page.x - this.progBox.getPosition().x) / (this.progBox.getStyle("width").toInt() / 100) / 100);
            this.player.seek(s);
            dbug.log("progBar: " + s);
        }.bind(this));

        if(this.options.shrinkable){
            this.idleTimer = new IdleTimer(this.element, {    timeout: 6000,
                                            events: ['mousemove', 'keydown', 'mousewheel', 'mousedown', "mouseenter"],
                                            onIdle : function(){
                                                        this.shrink();
                                                    }.bind(this)
                                        }).start();
            this.element.addEvent("mouseenter", this.grow.bind(this));
            this.element.addEvent("mouseleave", this.shrink.bind(this));
        }
         

  },
  grow  : function(){
        if(!this.shrunk)
            return;
        $(this).tween("height", this.options.grownHeight);
        (function(){ this.buttons.fade("in"); this.shrunk = false; $(this).addClass("grown").removeClass("shrunk"); }.bind(this)).delay(500);
        
  },
  shrink: function(){
      if(this.shrunk)
        return;
      this.buttons.fade("out");
      (function(){ $(this).tween("height", this.options.shrunkHeight); $(this).addClass("shrunk").removeClass("grown"); }.bind(this)).delay(500);
      this.shrunk = true;
  },
  pause: function(){
      dbug.log("mtAudioPlayerUI::pause()");
      if(this.buttonElems.toggle){
          this.buttonElems.toggle.set("html", "play");
          this.buttonElems.toggle.addClass("pause");
          this.buttonElems.toggle.removeClass("play");          
      }

    
      this.fireEvent("pause")  
  },
  play: function(){
      dbug.log("mtAudioPlayerUI::play()");
      if(this.buttonElems.toggle){
          this.buttonElems.toggle.set("html", "pause");
          this.buttonElems.toggle.addClass("play");
          this.buttonElems.toggle.removeClass("pause");          
      }

      this.readoutElems.name && this.readoutElems.name.set("html",this.player.getTrack().name);

      $clear(this.updateTimer);
      this.updateTimer = this.updatePos.periodical(1000, this);
      
      if(this.options.includeProgressBar){
          (function(){
              this.progBar.setStyle("width",this.player.getPosition());
          }.bind(this)).delay(250);
      }
      
     this.fireEvent("play");
  },

  formatTime : function(s){
      s = s.round();
      var m = (s / 60).floor();
          s = (s % 60);
          s = s < 10 ? "0"+s : s;

      return m + ":" + s;
  },
  updatePos : function(){
      var c = this.player.getPosition();
      var p = this.formatTime(c);
      var d = this.formatTime(this.player.getDuration() - c);
      this.readoutElems.pos.set("html", p);
      this.readoutElems.dur.set("html", d);
      
      this.progBar.setStyle("width", (c / this.player.getDuration()) * this.progBox.getStyle("width").toInt());
  },
  inject : function(){
    $(this.options.parent).adopt(this.element);

    return this;
  }
});


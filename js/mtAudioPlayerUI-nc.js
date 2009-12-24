var mtAudioPlayerUI = new Class({
  Implements : [Options, Events],
  options : {
      id            : false,
      "class"       : "mtAPlayerUI",
      parent        : null,
      player        : null,
      shrinkable    : true,
      shrunkHeight  : 1,
      grownHeight   : 42,
      buttonElems   : {
          prev         : new Element("a", { html : "&laquo;" , href : "#", "class" : "button prev" }),
          toggle       : new Element("a", { html : "play" , href : "#", "class" : "button toggle" } ),
          next         : new Element("a", { html : "&raquo;" , href : "#", "class" : "button next" }),
          /*rw           : new Element("a", { html : "&larr;" , href : "#", "class" : "rw" }),*/
          /*stop         : new Element("a", { html : "&curren;" , href : "#", "class" : "button stop" }),*/
          /*ff           : new Element("a", { html : "&rarr;" , href : "#", "class" : "ff" }),*/
          /*mute         : new Element("a", { html : "mute" , href : "#", "class" : "button mute" })*/
      },
      volElems        : {
          down              : new Element("a", { html : "&laquo;" , href : "#", "class" : "down" }),
          volBox            : new Element("div", { "class" : "vol-box" }).adopt(new Element("div", { "class" : "vol-bar" })),
          up                : new Element("a", { html : "&raquo;" , href : "#", "class" : "up" })
      },
      progressElems   : {
          pos           : new Element("span", { html : "0:00" , href : "#", "class" : "pos" }),
          progBox       : new Element("div", { "class" : "prog-box" }).adopt(new Element("div", { "class" : "prog-bar" })),
          buffBox       : new Element("div", { "class" : "buff-box" }).adopt(new Element("div", { "class" : "buff-bar" })),
          dur           : new Element("span", { html : "0:00" , href : "#", "class" : "dur" })
      },
      readoutElems   : {
          name           : new Element("div", { html : "" , href : "#", "class" : "name" }),
          artist          : new Element("div", { html : "" , href : "#", "class" : "artist" })
      },
      includeProgressBar : true
      
      
  },
  elems             : $H({}),
  buttons           : $H({}),
  shrunk            : false,
  playing           : null,
  playingDur        : 0,
  toElement   : function(){ return this.element; },
  initialize  : function(player,ops){
    this.setOptions(ops);

    if(this.options.parent == null)
      this.options.parent = document.body;

    this.options.id   = this.options.id ? this.options.id : "mtaudioui-"+ Math.floor(Math.random()*1000000000).toString(16)

    //if(typeof this.options.player != "object")
      //throw("A valid mtAudioPlayer object is requried");

    this.player             = player;
    this.buttonElems        = $H(this.options.buttonElems);
    this.readoutElems       = $H(this.options.readoutElems);
    this.progressElems      = $H(this.options.progressElems);
    this.volElems           = $H(this.options.volElems);

    this.element            = new Element('div', { id : this.options.id, "class" : this.options["class"] });

    this.buttons            = new Element("div", { id : this.options.id+'_buttons', "class" : "buttons" }).adopt(this.buttonElems.getValues());        
    this.readout            = new Element("div", { id : this.options.id+'_read', "class" : "readout" }).adopt([this.readoutElems.getValues(),this.progressElems.getValues()]);
    this.volume             = new Element("div", { id : this.options.id+'_vol', "class" : "volume"}).adopt([this.volElems.getValues()]);
    
    this.element.adopt([this.buttons,this.readout, this.volume]);

    this.volBox     = this.volElems.get("volBox");
    this.volBar     = this.volBox.getElement(".vol-bar");

    this.progBox    = this.progressElems.get("progBox");
    this.progBar    = this.progBox.getElement(".prog-bar");
    this.buffBox    = this.progressElems.get("buffBox");
    this.buffBar    = this.buffBox.getElement(".buff-bar");
        
    this.initEvents();
    
    this.setVolume(this.player.get("volume"));
    
  },
  initEvents: function(){
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
        
        if(this.volElems.up){
            this.volElems.up.addEvent("click", function(e){
                e.stop();
                my.setVolume(my.player.get("volume") + 10);
            })
        }

        if(this.volElems.down){
            this.volElems.down.addEvent("click", function(e){
                e.stop();
                my.setVolume(my.player.get("volume") - 10);
            })
        }


        if(this.volBox){
            this.volBox.addEvent("click", function(e){
               my.setVolume( ( (e.page.x - my.volBox.getPosition().x) / my.volBox.getStyle("width").toInt() ) * 100 );
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

        dbug.log("mtAudioPlayerUI : adding onPlay event");
        this.player.addEvent("play", this.play.bind(this) );
        this.player.addEvent("pause", this.pause.bind(this) );
        this.player.addEvent("buffered", function(track, end){
            if(track.file == this.player.get("track").file){
                var bw = this.buffBox.getStyle("width").toInt();
                var w = (end / this.player.getDuration()) * bw;
                    w = w > bw ? bw : w;
                this.buffBar.setStyle("width", w)
            }
        }.bind(this));
        
        this.progBox.addEvent("click", function(e){
            var s = this.playingDur * ((e.page.x - this.progBox.getPosition().x) / (this.progBox.getStyle("width").toInt() / 100) / 100);
            this.player.seek(s);
            dbug.log("progBox: " + s);
        }.bind(this));
        this.progBar.addEvent("click", function(e){
            var s = this.playingDur * ((e.page.x - this.progBox.getPosition().x) / (this.progBox.getStyle("width").toInt() / 100) / 100);
            this.player.seek(s);
            dbug.log("progBar: " + s);
        }.bind(this));

        if(this.options.shrinkable){
            var noshrink = $(this.options.noShrinker ? this.options.noShrinker : this.element);
            this.idleTimer = new IdleTimer(noshrink, {    timeout: 6000,
                                            events: ['mousemove', 'keydown', 'mousewheel', 'mousedown', "mouseenter"],
                                            onIdle : function(){
                                                        this.shrink();
                                                    }.bind(this)
                                        }).start();
            noshrink.addEvent("mouseenter", this.grow.bind(this));
            noshrink.addEvent("mouseleave", this.shrink.bind(this));
        }
         

  },
  grow  : function(){
        if(!this.shrunk)
            return;
        $(this).tween("height", this.options.grownHeight);
        (function(){ this.shrunk = false; $(this).addClass("grown").removeClass("shrunk"); }.bind(this)).delay(500);
        this.fireEvent("grow");
  },
  shrink: function(){
      if(this.shrunk)
        return;
      $(this).tween("height", this.options.shrunkHeight); 
      $(this).addClass("shrunk").removeClass("grown"); 
      this.shrunk = true;
      this.fireEvent("shrink");
  },
  pause: function(){
      dbug.log("mtAudioPlayerUI::pause()");
      if(this.buttonElems.toggle){
          this.buttonElems.toggle.set("html", "play");
          this.buttonElems.toggle.addClass("pause");
          this.buttonElems.toggle.removeClass("play");          
      }

      $clear(this.updateTimer);
      this.fireEvent("pause")  
  },
  play: function(){
      dbug.log("mtAudioPlayerUI::play()");
      if(this.buttonElems.toggle){
          this.buttonElems.toggle.set("html", "pause");
          this.buttonElems.toggle.addClass("play");
          this.buttonElems.toggle.removeClass("pause");          
      }

      (function(){
          this.playing      = this.player.get("track");
          this.playingDur   = this.player.get("duration");
          $clear(this.updateTimer);
          this.updateTimer = this.updatePos.periodical(1000, this);
          this.readoutElems.name && this.readoutElems.name.set("html",this.playing.name);
          this.readoutElems.artist && this.playing.artist && this.readoutElems.artist.set("html", this.playing.artist);

          this.setVolume(this.player.get("volume"));

           if(this.options.includeProgressBar){
               (function(){
                   this.progBar.setStyle("width",this.player.get("position"));
               }.bind(this)).delay(250);
           }

          this.fireEvent("play");

      }.bind(this)).delay(1000);
      
  },

  formatTime : function(s){
      s = s.round();
      var m = (s / 60).floor();
          s = (s % 60);
          s = s < 10 ? "0"+s : s;

      return m + ":" + s;
  },
  setVolume : function(v){
      dbug.log("mtAudioPlayerUI::setVolume(%n)",v);
      var vbxw = this.volBox.getStyle("width").toInt();
      this.volBar.setStyle("width", ((v / 100) * vbxw).limit(0,vbxw) );
      if(this.player.get("volume") != v)
        this.player.setVolume(v);
  },
  updatePos : function(){
      var c = this.player.getPosition();
      var p = this.formatTime(c);
      var d = this.formatTime(this.playingDur - c);
      this.progressElems.pos.set("html", p);
      this.progressElems.dur.set("html", d);
      var pwmx = this.progBox.getStyle("width").toInt();

      this.progBar.setStyle("width", ((c / this.playingDur) * pwmx).limit(0, pwmx));
  },
  inject : function(){
    $(this.options.parent).adopt(this.element);

    return this;
  }
});


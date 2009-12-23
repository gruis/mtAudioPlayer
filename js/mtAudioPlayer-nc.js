var mtAudioPlayer = new Class({
  Implements: [Options,Events],
  options: {
      "class"   : "mtAPlayer",
      id        : false,
      tracks    : [],
      parent    : null,
      auto      : false,
      repeat    : false,
      volume    : 20,   /* 0 - 100 */
      format    : false,
      formats   : ["mp3", "ogg"],
      onLoading : function(t){ dbug.log("Loading : " + t); },
      onError   : function(code){ 
                    if(code == 4){
                      throw("mtAudioPlayer Error: track not found, or not supported");                       
                    }
                    throw("mtAudioPlayer Unrecognized Error; code: " + code);
                }
  },
  tracks        : $H({}),
  currTrack     : 0,
  isPlaying     : false,
  muted         : false,
  format        : false,
  toElement: function(){ return this.element; },
  initialize: function(ops){
    this.setOptions(ops);
    if(this.options.parent == null)
      this.options.parent = document.body;
    
    this.soundCheck = new AudioCheck();    
    if(!this.soundCheck.check())
      throw("HTML5 audio is not supported");

    this.format = this.options.format ? this.options.format : this.determineFormat();
    if(!this.format){
        throw("No supported format found");
    }
    

    this.makePlayList(this.options.tracks);
    
    
    this.element  = new Element('div', { id : this.options.id ? this.options.id : "mtaudio-"+ Math.floor(Math.random()*1000000000).toString(16), "class" : this.options["class"] });
    
  },
  determineFormat : function(){
      dbug.log("determineFormat");
      for(var i = 0; i < this.options.formats.length; i++){
          dbug.log("checking " + this.options.formats[i]);
          if(this.soundCheck.check(this.options.formats[i])){
              return this.options.formats[i];
          }
      }
  },
  getMediaType: function(t){
      if(typeof t == "string")
        return t.substring( t.lastIndexOf(".") + 1 );
  },
  makePlayList: function(arr){
        dbug.log("makePlaylist()");
        dbug.log(arr);
        var track;
        for(var i = 0; i < arr.length; i++){
            this.addTrack(arr[i]);
        }
  },
  cacheNext: function(){
      dbug.log("mtAudioPlayer::cacheNext()");
    var next = this.currTrack + 1;
    if(next >= this.tracks.getLength())
      return;
      
    var t = this.getTrack(next);
      if(!t.audio.get("src")){
          t.audio.set("src",t.file);
          this.addEvents(t);
          t.audio.load();
          this.fireEvent("loading", t.file);
      }

      return this;
  },
  addEvents: function(track){
        dbug.log("mtAudioPlayer::addEvents(track)");
        
        try{
             var my = this;
             var dbugEvents = [ ]/* "timeupdate", "waiting", "ended", "loadstart", "progress", "emptied", "stalled", 
                                 "play", "pause", "loadedmetadata", "loadeddata", "waiting", "playing", "canplay", 
                                 "canplaythrough", "seeking", "seeked", "timeupdate", "ended", "ratechange", 
                                 "durationchange", "volumechange", "abort", "error"];*/
             var pushEvents = [ "play", "pause", "ended", "dataunavailable", "loadedmetadata", "progress" ]

                     track.audio.addEventListener("error", function(){
                         dbug.log("Caught Error " + name);
                         my.fireEvent("error", name, track.audio.error.code);
                     },true);
                     track.audio.addEventListener("abort", function(){
                         my.fireEvent("abort", name);
                     },true);      
                     track.audio.addEvent

                     $each(pushEvents, function(e){
                         if(!e)
                            return;
                         track.audio.addEventListener(e, function(){
                            my.fireEvent(e,track);
                         }, true);
                     });


                     if(dbug.enabled){
                         $each(dbugEvents, function(e){
                             track.audio.addEventListener(e, function(){
                                my.fireEvent(e,track);
                             }, true);
                         });
                     }


             this.addEvent("progress", function(track){
                  track.audio.buffered && track.audio.buffered.end && this.fireEvent("buffered", [track, track.audio.buffered.end()]);
             });

            this.addEvent("loadedmetadata", function(track){
                if(track.file == my.getTrack().file)
                     my.setDuration();
            });

            this.addEvent("ended", function(){
                my.next();
            });

            this.addEvent("play", function(track){
                track.audio.muted   = my.muted;
                track.audio.volume  = (my.options.volume / 100).round(2);
                dbug.log("volume : " + track.audio.volume);
                my.isPlaying = true; 
            });

            this.addEvent("pause", function(){
                my.isPlaying = false;
            });            
        } catch(e){
            dbug.log(e);
        }

  },
  inject: function(){
      this.options.parent.grab(this.element);
      
      return this;
  },
  getTrack: function(i){
    if(!i)
        i = this.currTrack;
        
    if(typeof i == "number" && i < this.tracks.getKeys().length && i >= 0){
        return this.tracks.get(this.tracks.getKeys()[i]);
    } 
    if(typeof i == "string" && this.tracks.has(i)){
      return this.tracks.get(i);
    }
    
    throw("Track " + i + " is not in the playlist");
  },
  addTrack: function(track){      
      if(typeof track == "string"){
          arr[track] = { file: track, pos : 0, audio : new Audio("") }
      } else if(typeof track == "object"){
          if(track[this.format]){
              track.pos     = track.pos ? track.pos : 0;
              track.audio   = new Audio("");
              track.file    = track[this.format];
              track.name    = track.name ? track.name : this.formatName(track.file);
              this.tracks[track.name] = track;
          }
      }
      
      return this;
  },
  getVolume : function(){
      return (this.getTrack().audio.volume * 100).round();
  },
  setVolume : function(v){
      v = v > 100 ? 100 : v;
      this.options.volume = v;
      this.getTrack().audio.volume = (v / 100);
      return this;
  },
  mute: function(){
      if(this.getTrack().audio.muted){
        this.getTrack().audio.muted = false;
        this.muted = false;
        return this;  
      } 
      this.getTrack().audio.muted = true;
      this.muted = true;
      return this;
  },
  rmTrack: function(t){
    if(typeof t == "number"){
      this.tracks.erase(this.tracks.getKeys()[t]);
    } else {
      this.tracks.erase(t);
    }
    return this;
  },
  // call playing to determine which way the toggle went
  toggle : function(){
      dbug.log("mtAudioPlayer::toggle()");
      if(this.isPlaying){
        this.pause();
      } else {
        this.play();
      }
      return this;
  },
  play: function(t){
      dbug.log("mtAudioPlayer::play()");
      var t    = this.getTrack(t);

      if(!t.audio.get("src")){
          t.audio.set("src", t.file);  
          this.addEvents(t);
      }
        
      if(t.audio.readyState <= t.audio.HAVE_CURRENT_DATA){
          if(!this.soundCheck.check(this.getMediaType(t.file))){
            this.fireEvent("error",4);
            return;
          }
          this.fireEvent("loading", t.file);
          t.audio.addEventListener("canplaythrough", function(){
             t.audio.play(); 
          }.bind(this),true);
          t.audio.load();
      } 

      t.audio.play();

      this.cacheNext();

      return this;
  },
  playing : function(){
      return !this.getTrack().audio.paused();
  },
  next : function(){
    this.nextTimer && $clear(this.nextTimer);
    
    this.pause();
    this.currTrack++;
    if(this.currTrack >= this.tracks.getKeys().length){
        this.resetAll();
        this.currTrack = 0;        
    }

    this.play();
  },
  prev : function(){
    this.pause();
    this.currTrack--;
    if(this.currTrack < 0)
      this.currTrack = this.tracks.getKeys().length - 1;
    this.play();
  },
  pause: function(){
        dbug.log("mtAudioPlayer::pause()");
  
        this.getTrack().pos = this.getPosition();
        this.getTrack().audio.pause();
        this.isPlaying = false;
    
    return this;
  },
  stop: function(){
    this.getTrack().audio.pause();
    this.getTrack().pos = 0;
    this.isPlaying = false;

    return this;
  },
  resetAll : function(){
      this.tracks.each(function(t){
         t.pos = 0; 
      });
  },
  setDuration : function(){
    var t = this.getTrack();
    if(t.audio.readyState >= t.audio.HAVE_METADATA){
      this.duration = t.audio.duration;
    }
  },
  getDuration : function(){
      return this.getTrack().audio.duration;
  },
  seek: function(s){
      dbug.log("mtAudioPlayer::seek("+s+")");
    var t = this.getTrack();
    if(t.audio.readyState == t.audio.HAVE_NOTHING)
      return;
    s = !!s ? s : t.pos;

    
    if(!!t.audio.seekable){
        if(t.audio.seekable.end() <= s){
            s = t.audio.seekable.end();
        }
    } 
    
    t.audio.currentTime = s; 
    
        
    return this;
  },
  getPosition: function(){
    return this.getTrack().audio.currentTime;
  },
  formatName : function(f){
      f =  f.substring(0,f.lastIndexOf(".")).replace(/_/g," ");

      if(f.indexOf("/"))
          f = f.substring(f.lastIndexOf("/") + 1); 

      return decodeURI(f);
  },
  getPlaylist : function(){
      return this.tracks;
  }
  
});
var mtTrack      = new Class({
   options: {
       pos      : 0,
       name     : null,
       artist   : null,
       file     : null,
       audio    : null,
       mp3      : null,
       ogg      : null,
       element  : null,
       elem     : null
   },
   initialize : function(format, track){
       dbug.log("mtTrack::initialize(%s,%o)",format,track);
       
       if(!format)
            throw "mtTrack cannot be instantiated without a format argument"
       
       if(typeof track == "string"){
           track = { file : track, name : this.formatName(track) };
       } 
       
       for(m in this.options){
           if(!this[m]){
               this[m] = track[m];
           }
               
       }

       if(this[format]){
           this.audio   = this.audio ? this.audio : new Audio("");
           this.file    = this.file ? this.file : this[format];
           this.name    = this.name ? this.name : this.formatName(this.file);
       } else {
           throw("mtTrack "+format+" formatted file not found ");
       }  
   },
   formatName : function(f){
       f =  f.substring(0,f.lastIndexOf(".")).replace(/_/g," ");

       if(f.indexOf("/"))
           f = f.substring(f.lastIndexOf("/") + 1); 

       return decodeURI(f);
   },
   toElement: function(){ return this.elem },
});

var mtAudioPlayer = new Class({
  Implements: [Options,Events],
  options: {
      "class"       : "mtAPlayer",
      id            : false,
      tracks        : null,
      parent        : null,
      auto          : false,
      repeat        : false,
      volume        : 20,   /* 0 - 100 */
      format        : false,
      formats       : ["ogg", "mp3"],
      pushEvents    : [ "play", "pause", "ended", "dataunavailable", "loadedmetadata", "progress" ],
      dbugEvents    : [], /* "timeupdate", "waiting", "ended", "loadstart", "progress", "emptied", "stalled", 
                           "play", "pause", "loadedmetadata", "loadeddata", "waiting", "playing", "canplay", 
                           "canplaythrough", "seeking", "seeked", "timeupdate", "ended", "ratechange", 
                           "durationchange", "volumechange", "abort", "error"],*/
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
      dbug.log("mtAudioPlayer::initialize(%o)",ops);
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
    
    this.options.tracks && this.makePlaylist(this.options.tracks);
    this.setVolume(this.options.volume);
    
    this.element  = new Element('div', { id : this.options.id ? this.options.id : "mtaudio-"+ Math.floor(Math.random()*1000000000).toString(16), "class" : this.options["class"] });
    dbug.log("mtAudioPlayer::initialized");
  },
  get: function(m,s){
      if(this[m] && typeof this[m] != "function")
        return this[m];

      var g = m.charAt(0).toUpperCase();
          m = "get" + g + m.substr(1);

      if(this[m] && typeof this[m] == "function")
            return this[m](s ? s : "");
  },
  set: function(m,v){
      if(this[m] && typeof this[m] != "function")
        return this[m] = v;

      var g = m.charAt(0).toUpperCase();
          m = "get" + g + m.substr(1);

      if(this[m] && typeof this[m] == "function")
            return this[m](v);
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
  cacheNext: function(){
      dbug.log("mtAudioPlayer::cacheNext()");
    var next = this.currTrack + 1;
    if(next >= this.tracks.getLength())
      return;
      
    var t = this.getTrack(next);
      if(!t.audio.get("src")){
          t.audio.set("src",t.file);
          this.initEvents(t);
          t.audio.load();
          this.fireEvent("loading", t.file);
      }

      return this;
  },
  initEvents: function(track){
        dbug.log("mtAudioPlayer::initEvents(%o)",track);        
             var my = this;
             window.addEvent("unload", this.stopAll.bind(this));
             
             track.audio.addEventListener("error", function(){
                 dbug.log("Caught Error " + name);
                 my.fireEvent("error", name, track.audio.error.code);
             },true);
             track.audio.addEventListener("abort", function(){
                 my.fireEvent("abort", name);
             },true);      
             track.audio.addEvent

             dbug.log("add play listener for %o",track);
             track.audio.addEventListener("play", function(){
                 my.currTrack =  my.tracks.getKeys().indexOf(track.name);
                  dbug.log("pushing play for %o : %o",my.currTrack, track);
             },true);


             $each(this.options.pushEvents, function(e){
                 if(!e)
                    return;
                 track.audio.addEventListener(e, function(){
                    my.fireEvent(e,track);
                 }, true);
             });
             



             if(dbug.enabled){
                 $each(this.options.dbugEvents, function(e){
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
                track.audio.volume  = (my.volume / 100).round(2);
                my.isPlaying = true; 
            });

            this.addEvent("pause", function(){
                my.isPlaying = false;
            });            

  },
  inject: function(){
      this.options.parent.grab(this.element);
      
      return this;
  },
  findTrackByFile : function(f){
      var l = this.tracks.length;
      for(var i = 0; i < l; i++){
          if(this.tracks[i].file == f)
            return this.tracks[i];
      }
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
        if(typeof i == "object"){
            if(i.name && this.tracks.has(i.name)){
                return this.tracks[i.name];
            }
                
            // search by name == *slow*
            if(i.file){
                t = this.findTrackByFile(i.file);
                if(t) return t;
            }
        }

        throw("Track " + i + " is not in the playlist", i);
  },
  addTracks: function(arr){
        return this.makePlaylist(arr);
  },
  makePlaylist: function(arr){
        dbug.log("mtAudioPlayer::makePlaylist(%o)",arr);
        var track;
        arr.each(function(t){
           this.addTrack(t); 
        }.bind(this));
        
        return this;
  },
  addTrack: function(track){
      try{
          var t = new mtTrack(this.format,track);    
          this.tracks[t.name] = t;
      } catch(e){
          dbug.error("Unable to add track %o: %s",t,e);
      }
      
      return this;
  },
  getVolume : function(){
      return (this.getTrack().audio.volume * 100).round();
  },
  setVolume : function(v){
      v     =   v.limit(0,100);
      this.volume = v;
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
      dbug.log("mtAudioPlayer::play(%o)",t);
      var t    = this.getTrack(t);
      dbug.log("t : %o", t);
      
      if(!t.audio.get("src")){
          t.audio.set("src", t.file);  
          this.initEvents(t);
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
  pause: function(track){
        dbug.log("mtAudioPlayer::pause()");
        if(!track){
            track           = this.getTrack();
            this.isPlaying  = false;
        }
        
        track       = track ? track : this.getTrack();
        track.pos   = track.audio.position;
        track.audio.pause();        
    
    return this;
  },
  stop: function(track){
      if(!track){
          track           = this.getTrack();
          this.isPlaying  = false;
      }
      track.audio.pause();
      track.pos     = 0;

    return this;
  },
  pauseAll : function(){
      this.tracks.each(function(t){
          this.pause(t);
      }.bind(this));
      return this;
  },
  stopAll: function(){
      this.tracks.each(function(t){
          this.stop(t);
      }.bind(this));
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
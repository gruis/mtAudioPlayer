var mtAudioPlayer = new Class({
  Implements: [Options,Events],
  options: {
      "class"   : "mtAPlayer",
      id        : false,
      tracks    : ["sample.mp3"],
      parent    : null,
      auto      : false,
      repeat    : false,
      onLoading : function(t){ dbug.log("Loading : " + t); },
      onError   : function(code){ 
                    if(code == 4){
                      throw("mtAudioPlayer Error: track not found, or not supported");                       
                    }
                    throw("mtAudioPlayer Unrecognized Error; code: " + code);
                }
  },
  tracks      : $H({}),
  currTrack   : 0,
  isPlaying   : false,
  toElement: function(){ return this.element; },
  initialize: function(ops){
    this.setOptions(ops);
    if(this.options.parent == null)
      this.options.parent = document.body;
    
    this.soundCheck = new AudioCheck();    
    if(!this.soundCheck.check())
      throw("HTML5 audio is not supported");
    
    var pt         = this.pruneTracks(this.options.tracks);    
    if(pt[1].length)
        this.fireEvent("prune", pt[1]);
    if(pt[0].length <= 0){
      throw("No supported tracks found");
    }
    this.makePlayList(pt[0]);
    
    this.addEvents();
    
    this.element  = new Element('div', { id : this.options.id ? this.options.id : "mtaudio-"+ Math.floor(Math.random()*1000000000).toString(16), "class" : this.options["class"] });
    
  },
  getMediaType: function(t){
      if(typeof t == "string")
        return t.substring( t.lastIndexOf(".") + 1 );
  },
  makePlayList: function(arr){
    for(var i = 0; i < arr.length; i++){
      this.tracks[arr[i]] = { file: arr[i], pos : 0, audio : new Audio("") };
    }
  },
  /* Prune cannot be called after the tracks have been converted to objects */
  pruneTracks: function(tracks){
      var pruned = [];
      var l = tracks.length;
      for(var i = 0; i < l; i++){
          if( !this.soundCheck.check(this.getMediaType(tracks[i])) ){
              pruned.push(tracks.splice(i,1));
          }
      }
      return [tracks, pruned];
  },
  cacheNext: function(){
    var next = this.currTrack + 1;
    if(next >= this.tracks.getLength())
      return;
      
    var t = this.getTrack(next);
      if(!t.audio.get("src")){
          t.audio.set("src",t.file);
          t.audio.load();
          this.fireEvent("loading", t.file);
      }

      return this;
  },
  addEvents: function(){
    var my = this;
    this.tracks.each(function(track, name){
        track.audio.addEvent("error", function(){
            dbug.log("Caught Error");
            my.fireEvent("error",track.audio.error.code);
        });
        track.audio.addEvent("abort", function(){
            dbug.log("Caught Abort");
            my.fireEvent("abort");
        });      
        track.audio.addEvent("timeupdate", function(){
            dbug.log("Caught timeupdate");
        });
        track.audio.addEvent("waiting", function(){
            dbug.log("Caught waiting");
        });
        track.audio.addEvent("ended", function(){
            dbug.log("ended");
        });
    })
    
    
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
  addTrack: function(so){
      if(typeof so == "object"){
          if(!so.file)
            throw("addTrack requires either a String or an object with a file attribute as an argument");
          if(!so.audio)
            so.audio = new Audio("");
          if(!so.pos)
            so.pos = 0;
            
          this.tracks.set(so.file, so);
      } else if(typeof so == "string"){
        this.tracks.set(so, { file : so, pos : 0, audio : new Audio("")});
      }
      
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
  toggle : function(){
      if(this.isPlaying){
        this.pause();
        return "play";
      } else {
        this.play();
        return "pause";
      }
      
  },
  playReady: function(){
      var t = this.getTrack();
      if(t.audio.readyState == t.audio.HAVE_ENOUGH_DATA){
          if(t.pos == t.audio.duration)
            t.pos = 0;
          this.seek(t.pos);
          t.audio.play();
          this.playing();
          $clear(this.prTimer);
      }
  },
  playing: function(){
      this.isPlaying = true;
      this.resetNextTimer();
      this.fireEvent("playing", this.getTrack().file);
  },
  play: function(t){
      var t    = this.getTrack(t);

      if(!t.audio.get("src"))
        t.audio.set("src", t.file);
      if(t.audio.readyState <= t.audio.HAVE_CURRENT_DATA){
          if(!this.soundCheck.check(this.getMediaType(t.file))){
            this.fireEvent("error",4);
            return;
          }
          this.fireEvent("loading", t.file);
          t.audio.load();
      } 

      this.drTimer = this.setDuration.periodical(250, this);
      this.srTimer = this.seek.periodical(2500, this);      
      this.prTimer = this.playReady.periodical(250, this);

      this.cacheNext();

      return this;
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
  resetNextTimer : function(){
      if(this.nextTimer){
        $clear(this.nextTimer);
        this.nextTimer = this.next.delay((this.duration - this.getPosition()) * 1000, this);
      }
  },
  setDuration : function(){
    var t = this.getTrack();
    if(t.audio.readyState >= t.audio.HAVE_METADATA){
      this.duration = t.audio.duration;
      this.drTimer && $clear(this.drTimer);        
    }
  },
  seek: function(s){
    var t = this.getTrack();
    if(t.audio.readyState == t.audio.HAVE_NOTHING)
      return;
    s = !!s ? s : t.pos;

    if(!!t.audio.seekable && t.audio.seekable.end() >= s){
      t.audio.currentTime = s;
      this.resetNextTimer();
      this.srTimer && $clear(this.srTimer);   
    }
        
    return this;
  },
  getPosition: function(){
    return this.getTrack().audio.currentTime;
  }
  
});
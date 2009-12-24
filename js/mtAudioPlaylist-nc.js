var mtAudioPlaylist = new Class({
   Implements   : [Options,Events],
   options      : {
        "class"         : "mtAPlaylist",
        id              : false,
        parent          : null,
        format          : false,
        tracks          : [],
        formats         : ["ogg", "mp3"],
        player          : null,
        onFailure       : function(e){
                                dbug.error("mtAudioPlaylsit::onFailure(%o)",e);
                          },
        onPlay          : function(track){
                                dbug.log("mtAudioPlaylist::onPlay(%o)",track);
                                this.each(function(t){
                                    $(t) && $(t).removeClass("active");
                                });
                                $(track) && $(track).addClass("active")
                          }
   },
   tracks        : $H({}),
   trackElems    : [],
   toElement    : function(){ return this.element },
   initialize   : function(ops){
       dbug.log("mtAudioPlaylist::initialize(%o)",ops);
       

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

       this.player = this.options.player;

       this.element  = new Element('ol', { id : this.options.id ? this.options.id : "mtaudio-playlist-"+ Math.floor(Math.random()*1000000000).toString(16), "class" : this.options["class"] });

       this.makePlayList(this.options.tracks);
       this.initEvents();
              
   },
   each: function(fnc){
       this.tracks.each(fnc);
   },
   initEvents: function(){
        dbug.log("mtAudioPlaylist::initEvents()");
        this.player && this.player.addEvent("play", function(t){
                        this.fireEvent("play", t);
        }.bind(this));
        return this;
   },
   setPlayer: function(p){
       this.player = p;
       return this.initEvents();
   },
   inject: function(){
       this.options.parent.grab(this.element);
       this.element.adopt(this.trackElems);

       return this;
   },
   makePlayList: function(arr){
         dbug.log("mtAudioPlaylist::makePlaylist(%o)",arr);
         var track;
         arr.each(function(t){
             this.addTrack(t);
         }.bind(this));
   },
   addTrack : function(track){
       try{
           var t = new mtTrack(this.format,track);    
           this.tracks.set(t.name,t);
           this.makeTrackElem(t);
           this.trackElems.push(t.elem);
       } catch(e){
           dbug.error("Unable to add track %o: %s",t,e);
       }

       return this;       
   },
   makeTrackElem : function(track){
       track.elem = new Element('li', {   "class" : "track",  html    :  track.artist ? track.name + " ("+track.artist+")" : track.name });
       track.elem.store("track", track);
       this.addTrackEvents(track);
       return this;
   },
   addTrackEvents: function(track){
       var my = this;
       track.elem.addEvents({
           "click" : function(){
               dbug.log("caught click on %o",this.retrieve("track"));
               try{
                   my.player.pause().play(this.retrieve("track"));
               } catch(e){
                   my.fireEvent("failure", { msg : e, code : "1" , track : this.retrieve("track") });
               }
           }           
       });
       return this;
   },
   determineFormat : function(){
       dbug.log("mtAudioPlaylist::determineFormat()");
       this.soundCheck = this.soundCheck ? this.soundCheck : new AudioCheck();
       for(var i = 0; i < this.options.formats.length; i++){
           dbug.log("checking " + this.options.formats[i]);
           if(this.soundCheck.check(this.options.formats[i])){
               return this.options.formats[i];
           }
       }
   },
   formatName : function(f){
       f =  f.substring(0,f.lastIndexOf(".")).replace(/_/g," ");

       if(f.indexOf("/"))
           f = f.substring(f.lastIndexOf("/") + 1); 

       return decodeURI(f);
   }
});
var AudioCheck = new Class({
    initialize : function(options){
    },
    check   : function(type){
        if(!!type)
            return this.canPlay(type);
        return this.isSupported();
    },
    isSupported : function(){
        if(!!(document.createElement('audio').canPlayType) == false)
            return false;

        var a = new Audio("");
        return !!( !!(a.canPlayType) ? a.play : false);
        
    },
    canPlay : function(type){
        if(!this.isSupported())
            return false;
        
        type = type.toLowerCase();
        switch(type){
            case "mp3":
                type = "mpeg";
                break;
            case "au":
                type = "basic";
                break;
            case "snd":
                type = "basic";
                break;
            case "wav":
                type = "x-wav";
                break;
            case "aif":
                type = "aiff";
                break;
            case "aifc":
                type = "aiff";
                break;
        }
        
        type = "audio/" + type;            

        var a = new Audio("");
        if (a.canPlayType) {
            return ("no" != a.canPlayType(type)) && ("" != a.canPlayType(type))
        }
        
        return false;
    }
});
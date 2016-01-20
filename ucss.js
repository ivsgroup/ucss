var Class        = require('uclass');
var base64encode = require('ubase64/encode');
var forEach      = require('mout/array/forEach');
var path         = require('path');

//var url          = require('url'); //this works as expected
var url = {
  parseDir : function(url){
    var foo = /https?:\/\/[^\/]+(\/[^?#]+)/;
    if(!foo.test(url))
      return url;
    var path = foo.exec(url)[1];
    return path.substr(path.lastIndexOf('/'));
  }
}



  //anchor [,options] ,chain
module.exports = function(anchor, options, chain){
  var args = [].slice.call(arguments);
  anchor  = args.shift();
  chain   = args.pop();
  options = args.pop()

  return (new uCSS(anchor, options)).process(chain);
}



var uCSS = new Class({
  Implements : [
    require('uclass/options'),
  ],
  pseudosRegex : (function() {
    var ignoredPseudos = [
          /* link */
          ':link', ':visited',
          /* user action */
          ':hover', ':active', ':focus',
          /* UI element states */
          ':enabled', ':disabled', ':checked', ':indeterminate',
          /* pseudo elements */
           '::first-line', '::first-letter', '::selection', '::before', '::after',
          /* pseudo classes */
          ':target',
          /* CSS2 pseudo elements */
          ':before', ':after'
        ];
    return new RegExp("([^,: ])(?:"+ignoredPseudos.join('|')+")", 'g');
  }()),
  
  anchor     : null,
  parentPath : null,

  options : {
    //base64 images
    inlineimages  : false,
    //inline fonts using dataURI
    inlineFonts   : false,
    //when not inlining fonts, assume all fonts are available in fontsDir
    fontsDir      : '/fonts/',
    imagesBaseDir : '/resources',
    AbsolutePath  : false
  },

  initialize : function(anchor, options) {
    this.anchor   = anchor;
    this.setOptions(options);

    //auto references document & window for portability
    this.document = anchor.ownerDocument;
    this.window   = this.document.defaultView;

    var container = anchor;
    this.parentPath = [anchor];

    while(container != this.document.documentElement && container != null)
      this.parentPath.push(container = container.parentNode);

    this.parentPath.reverse();
  },

  getBinary: function (url) {
    var XMLHttpRequest = this.window.XMLHttpRequest;
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, false);
    xhr.overrideMimeType("text/plain; charset=x-user-defined");
    xhr.send(null);
    return xhr.responseText;
  },


  process  : function(chain){
    var out = [], self = this;

    forEach(this.document.styleSheets, function(style, index) {
      if (!style.rules) return;

      forEach(style.rules, function(rule) {
        out = out.concat(self.recss(rule));
      });
    });

    chain(null, out.join(''));
  },

  recss:function(rule) {
    var out = [], self = this;

    var remoteMatch = new RegExp("url\\((.*)\\)");

    if(rule instanceof this.window.CSSFontFaceRule) {
      var src = rule.style.src, outFace = rule.cssText;

      if(remoteMatch.test(src)) {
        var fontPath, fontUrl = remoteMatch.exec(src)[1];
        if(self.options.inlineFonts) {
          var base64EncodedFont = base64encode(this.getBinary(fontUrl));
          fontPath = "url('data:application/font-ttf;base64, " + base64EncodedFont + "')";
        } else {
          fontPath = "url('"+ self.options.fontsDir + url.parseDir(fontUrl) + "')";
        }
        outFace = outFace.replace(remoteMatch, fontPath);
      }

      out.push(outFace);
      return out;
    }

    if(rule instanceof this.window.CSSMediaRule) {
      out.push("@media " + rule.media.mediaText + "{ ");
      forEach(rule.cssRules, function(rule) {
        out = out.concat(self.recss(rule));
      });
      out.push("}");
    }

    if(!rule.selectorText)
      return out;

    var selector = rule.selectorText.replace(this.pseudosRegex, '$1');

    var elements = this.document.querySelectorAll(selector);

    var matched = false;
    for(var i= 0; i< elements.length; i++) {
      var parent = elements.item(i), hi = this.parentPath.indexOf(parent);
      if(hi != -1 &&  hi < 2) //html, body only, this behavior can be optionnal
        parent = this.anchor;

      while(parent != this.document.documentElement && parent != this.anchor)
        parent = parent.parentNode; 

      if(parent == this.anchor) {
        var topush = rule.cssText;
        if(remoteMatch.test(topush)) {
          var imageUrl = remoteMatch.exec(topush)[1].replace(new RegExp('"', 'g'), '');
          if (self.options.inlineimages) {
            var base64Image = base64encode(this.getBinary(self.options.imagesBaseDir + imageUrl));
                imagePath = "url('data:image/jpg;base64, " + base64Image + "')";
            topush = topush.replace(remoteMatch, imagePath);
            out.push(topush);
          }
          if (self.options.AbsolutePath) {
            var absoluteUrl = path.join(self.options.AbsolutePath, self.options.imagesBaseDir, imageUrl),
                imagePath = "url('" + absoluteUrl + "')";
            topush = topush.replace(remoteMatch, imagePath);
            out.push(topush);
          }
        }
        out.push(topush);
        break;
      }
    }
    return out;
  }

});

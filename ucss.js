var Class = require('uclass');

module.exports = function(anchor){
  return (new uCSS(anchor)).process();
}

if(!Array.each) Array.each = function(array, fn){
  for(var i=0;i<array.length;i++)
    fn(array[i], i);
}

var uCSS = new Class({

  pseudosRegex : (function(){
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

  initialize : function(anchor) {

    this.anchor   = anchor;

      //auto references document & window for portability
    this.document = anchor.ownerDocument;
    this.window   = this.document.defaultView;

    var container = anchor;
    this.parentPath = [anchor];

    while(container != this.document.documentElement)
      this.parentPath.push(container = container.parentNode);

    this.parentPath.reverse();
  },

  process  : function(){
    var out = [], self = this;

    Array.each(this.document.styleSheets, function(style, index) {
      if (!style.rules) return;

      Array.each(style.rules, function(rule) {
        out = out.concat(self.recss(rule));
      });
    });

    return out.join('');
  },

  recss:function(rule) {
    var out = [], self = this;

    if(rule instanceof this.window.CSSFontFaceRule) {
      out.push(rule.cssText);
      return out;
    }

    if(rule instanceof this.window.CSSMediaRule) {
      out.push("@media " + rule.media.mediaText + "{ ");
      Array.each(rule.cssRules, function(rule) {
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
        out.push(rule.cssText);
        break;
      }
    }
    return out;

  },

});

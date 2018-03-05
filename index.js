"use strict";

const forEach      = require('mout/array/forEach');
const deepMixIn    = require('mout/object/deepMixIn');
const sprintf      = require('nyks/string/format');
const base64encode = require('ubase64/encode');

const parseDir     = function(url) {
  var foo = /https?:\/\/[^/]+(\/[^?#]+)/;
  if(!foo.test(url))
    return url;
  var path = foo.exec(url)[1];
  return path.substr(path.lastIndexOf('/'));
};

const IGNORED_PSEUDOS = [
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
  ':before', ':after',
  /* Non standar pseudo features */
  '::-webkit-inner-spin-button', '::-webkit-outer-spin-button', '::-webkit-search-cancel-button', '::-webkit-search-decoration', '::-webkit-input-placeholder'
];

class Ucss {

  constructor(anchor, options) {

    this.options = {
      //base64 images
      inlineimages  : false,
      //inline fonts using dataURI
      inlineFonts   : false,
      //when not inlining fonts, assume all fonts are available in fontsDir
      fontsDir      : '/fonts',
      imagesBaseDir : '/resources',
      AbsolutePath  : false
    };

    this.pseudosRegex = (function() {
      return new RegExp("([^,: ])(?:" + IGNORED_PSEUDOS.join('|') + ")", 'g');
    }());

    this.anchor = anchor || null;

    deepMixIn(this.options, (options || {}));

    //auto references document & window for portability
    this.document = anchor.ownerDocument;
    this.window   = this.document.defaultView;

    var container   = anchor;
    this.parentPath = [anchor];

    while(container != this.document.documentElement && container != null)
      this.parentPath.push(container = container.parentNode);

    this.parentPath.reverse();
  }

  getBinary(url) {
    var XMLHttpRequest = this.window.XMLHttpRequest;
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, false);
    xhr.overrideMimeType("text/plain; charset=x-user-defined");
    xhr.send(null);
    return xhr.responseText;
  }

  process(chain) {
    var out = [];

    forEach(this.document.styleSheets, (style) => {
      if(!style.rules)
        return;

      forEach(style.rules, (rule) => {
        out = out.concat(this.recss(rule));
      });
    });

    chain(null, out.join(''));
  }

  recss(rule) {
    var out         = [];
    var remoteMatch = new RegExp("url\\((.*)\\)");

    if(rule instanceof this.window.CSSFontFaceRule) {
      var src     = rule.style.src;
      var outFace = rule.cssText;

      if(remoteMatch.test(src)) {
        var fontPath;
        var fontUrl = remoteMatch.exec(src)[1];
        if(this.options.inlineFonts) {
          var base64EncodedFont = base64encode(this.getBinary(fontUrl));
          fontPath = "url('data:application/font-ttf;base64, " + base64EncodedFont + "')";
        } else
          fontPath = "url('" + this.options.fontsDir + parseDir(fontUrl).replace(new RegExp('"', 'g'), '') + "')";
        outFace = outFace.replace(remoteMatch, fontPath);
      }

      out.push(outFace);
      return out;
    }

    if(rule instanceof this.window.CSSMediaRule) {
      out.push("@media " + rule.media.mediaText + "{ ");

      var has_rules = false;

      forEach(rule.cssRules, (child_rule) => {
        var rules = this.recss(child_rule);
        if(rules.length > 0)
          has_rules = true;
        out = out.concat(rules);
      });
      out.push("}");

      if(!has_rules)
        out = [];
    }

    if(!rule.selectorText)
      return out;

    var selector = rule.selectorText.replace(this.pseudosRegex, '$1');
    var elements = this.document.querySelectorAll(selector);

    for(var i = 0; i < elements.length; i++) {
      var parent = elements.item(i);
      var hi     = this.parentPath.indexOf(parent);
      if(hi != -1 &&  hi < 2) //html, body only, this behavior can be optionnal
        parent = this.anchor;

      while(parent != this.document.documentElement && parent != this.anchor)
        parent = parent.parentNode;

      if(parent == this.anchor) {

        var topush = rule.cssText;

        // page-break-after is ignored.... force it !
        if(rule.style.breakAfter != "")
          topush = topush.replace('break-after: page;', 'break-after: page; page-break-after: always;');

        if(remoteMatch.test(topush)) {
          var imageUrl = remoteMatch.exec(topush)[1].replace(new RegExp('"', 'g'), '');
          var search   = sprintf('%s%s', this.options.AbsolutePath, this.options.imagesBaseDir);
          imageUrl = imageUrl.replace(search, "");

          var imagePath = '';

          if(this.options.inlineimages)
            imagePath   = "url('data:image/jpg;base64, " + base64encode(this.getBinary(this.options.imagesBaseDir + imageUrl)) + "')";

          if(this.options.AbsolutePath)
            imagePath = "url('" + sprintf('%s%s', search, imageUrl) + "')";

          topush = topush.replace(remoteMatch, imagePath);
          out.push(topush);
        }
        out.push(topush);
        break;
      }
    }
    return out;
  }

}

//anchor [,options] ,chain
module.exports = function(anchor, options, chain) {
  var args = [].slice.call(arguments);
  anchor  = args.shift();
  chain   = args.pop();
  options = args.pop();

  return (new Ucss(anchor, options)).process(chain);
};

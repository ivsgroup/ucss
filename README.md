[![NPM version](https://img.shields.io/npm/v/microcss.svg)](https://www.npmjs.com/package/microcss)

Use in conjunction with [lonesomedom] or with [browserify]

# Api
```
var ucss = require('microcss');
ucss(domAnchor, [options,] chain(error, minimal_css)
``` 

# Example
```
ucss(document.getElementById("myelement"), function(err, minimalcssRules){
  console.log(minimalcssRules); //tadaaa
});
```

# Options 
```
* inlineFonts (default false) : fetch & inline used fonts (using data-url)
* fontsDir    (default /fonts/): when not inlining fonts, considers all fonts available in this path
* inlineBackgrounds (default false) : fetch & inline background images (using data-url)
* backgroundsBaseDir (default /resources) : Concat with relative backgrounds path in css file
```


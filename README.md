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
* inlineFonts (default true) : fetch & inline used fonts (using data-url)
* fontsDir    (default false): when not inlining fonts, considers all fonts available in this path
```


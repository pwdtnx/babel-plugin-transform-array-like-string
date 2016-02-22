# babel-plugin-transform-array-like-string

Turn array-like string indexers to String.prototype.charAt() calls.

## Example

**In**

```javascript
```

**Out**

```javascript
```

## Installation

```sh
$ npm install babel-plugin-transform-array-like-string
```

## Usage

### Via `.babelrc`

**.babelrc**

```json
{
  "plugins": ["transform-array-like-string"]
}
```

### Via CLI

```sh
$ babel --plugins transform-array-like-string script.js
```

### Via Node API

```javascript
require("babel-core").transform("code", {
  plugins: ["transform-array-like-string"]
});
```

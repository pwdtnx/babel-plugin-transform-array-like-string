import _isNaN from 'lodash.isnan';

export default function({ types: t, template }) {
  const buildStringIndexer = template(`STRING.charAt(INDEX)`);

  function isIndex(n) {
    return (
      t.isNumericLiteral(n) ||
      (t.isStringLiteral(n) &&
       (+n.value).toString() === n.value &&
       !_isNaN(+n.value))
    );
  }

  return {
    visitor: {
      MemberExpression: {
        exit(path) {
          const { node, parent, scope } = path;

          // skip if dotted notation
          if(!node.computed) {
            return;
          }

          const {
            object: o,
            property: p
          } = node;

          if(t.isStringLiteral(o)) {
            if(isIndex(p)) {
              // "str"[0], "str"["1"], not "str"[''], "str"['02']
              path.replaceWith(
                buildStringIndexer({
                  STRING: o,
                  INDEX: t.NumericLiteral(+p.value)
                })
              );
            }
          }
        }
      }
    }
  };
}

import _isNaN from 'lodash.isnan';

export default function({ types: t, template }) {
  const buildStringIndexer = template(`STRING.charAt(INDEX)`);

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
            if(t.isNumericLiteral(p) ||
               t.isStringLiteral(p) && !_isNaN(+p.value)) {
              // "str"[0], "str"["1"]
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

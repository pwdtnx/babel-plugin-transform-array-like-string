const traversed = new WeakSet();
const statements = new WeakMap();

export default function({ types: t, template }) {
  const buildIsString = template(`typeof V === 'string' || Object.prototype.toString.call(V) === '[object String]'`);
  const buildIsNumber = template(`typeof V === 'number' || Object.prototype.toString.call(V) === '[object Number]'`);
  const buildIsIndex = (() => {
    const tmpl = template(`(ISNUMBER || (ISSTRING && (+V).toString() === V)) && +V === +V`);
    return ({ V }) => {
      return tmpl({
        V,
        ISNUMBER: buildIsNumber({ V }),
        ISSTRING: buildIsString({ V }),
      });
    };
  })();

  const buildStringIndexer = (() => {
    const tmpl = template(`STRING.charAt(INDEX)`);
    return (expr) => {
      return tmpl({
        STRING: expr.object,
        INDEX: t.NumericLiteral(+expr.property.value)
      })
    };
  })();
  const buildStringProperty = (() => {
    const tmpl = template(`ISINDEX ? STRING.charAt(PROPERTY) : MEMBEREXPRESSION`);
    return (expr) => {
      return tmpl({
        STRING: expr.object,
        PROPERTY: expr.property,
        MEMBEREXPRESSION: expr,
        ISINDEX: buildIsIndex({ V: expr.property })
      });
    };
  })();

  const buildIdentfierIndexer = (() => {
    const tmpl = template(`ISSTRINGOBJECT ? OBJECT.charAt(INDEX) : MEMBEREXPRESSION`);
    return (expr) => {
      return tmpl({
        OBJECT: expr.object,
        INDEX: t.NumericLiteral(+expr.property.value),
        MEMBEREXPRESSION: expr,
        ISSTRINGOBJECT: buildIsString({ V: expr.object })
      });
    };
  })();
  const buildIdentifierProperty = (() => {
    const tmpl = template(`ISSTRINGOBJECT && ISINDEXPROPERTY ? STRING.charAt(PROPERTY) : MEMBEREXPRESSION`);
    return (expr) => {
      return tmpl({
        STRING: expr.object,
        PROPERTY: expr.property,
        MEMBEREXPRESSION: expr,
        ISSTRINGOBJECT: buildIsString({ V: expr.object }),
        ISINDEXPROPERTY: buildIsIndex({ V: expr.property })
      });
    };
  })();

  function isIndex(n) {
    return (
      t.isNumericLiteral(n) ||
      (t.isStringLiteral(n) &&
       (+n.value).toString() === n.value &&
       !Number.isNaN(+n.value))
    );
  }

  function getParentStatement(path) {
    let current = path
    let { parentPath, parentKey } = path;

    while(parentPath != null &&
      parentPath.parentPath != null &&
      !statements.has(current.node)
    ) {
      parentKey = current.parentKey;
      current = parentPath;
      parentPath = parentPath.parentPath;
    }

    return {
      parent: current,
      key: parentKey
    };
  }

  return {
    visitor: {
      MemberExpression: {
        exit(path) {
          const { node, parent, scope } = path;

          // skip if left value
          if(t.isAssignmentExpression(parent) && node === parent.left) {
            return;
          }

          // skip if dotted notation
          if(!node.computed) {
            return;
          }

          // skip if generated by this plugin
          if(traversed.has(node)) {
            return;
          }
          traversed.add(node);

          const {
            object: o,
            property: p
          } = node;

          let replacement;

          if(t.isStringLiteral(o)) {
            if(isIndex(p)) {
              // "str"[0], "str"["1"], not "str"[''], "str"['02']
              replacement = buildStringIndexer(node);
            } else if(t.isIdentifier(p)) {
              // "s"[a]
              replacement = buildStringProperty(node);
            }
          } else if(t.isIdentifier(o)) {
            if(isIndex(p)) {
              // a[0], a["1"], not a[''], a['02']
              replacement = buildIdentfierIndexer(node);
            } else if(t.isIdentifier(p)) {
              // a[b]
              replacement = buildIdentifierProperty(node);
            }
          } else {
            const id = scope.generateUidIdentifierBasedOnNode(node);
            const factorVar = t.variableDeclarator(id, node.object);
            const factoredMember = t.memberExpression(
              id,
              node.property,
              true
            );

            const { parent, key } = getParentStatement(path);
            const nodes = statements.get(parent.node);
            if(nodes != null) {
              nodes[key].push(factorVar);
            }

            replacement = factoredMember;
          }

          if(replacement) {
            path.replaceWith(replacement);
          }
        }
      },
      ExpressionStatement: {
        enter({ node }) {
          statements.set(node, {
            expression: []
          });
        },
        exit(path) {
          const { node } = path;
          const { expression } = statements.get(node, {
            expression: []
          });

          path.insertBefore([
            ...expression.map((n) => {
              return t.variableDeclaration('let', [n])
            })
          ]);

          statements.delete(node);
        }
      },
      ForStatement: {
        enter({ node }) {
          statements.set(node, {
            init: [],
            test: [],
            update: []
          });
        },
        exit(path) {
          const { node } = path;
          const { init, test, update } = statements.get(node, {
            init: [],
            test: [],
            update: []
          });

          path.ensureBlock();

          node.body.body = [
            ...node.body.body,
            ...update.map((n) => {
              return t.assignmentExpression('=', n.id, n.init);
            }),
            ...test.map((n) => {
              return t.assignmentExpression('=', n.id, n.init);
            }),
          ];

          path.insertBefore([
            ...init.map((n) => {
              return t.variableDeclaration('let', [n])
            }),
            ...test.map((n) => {
              return t.variableDeclaration('let', [n])
            }),
            ...update.map((n) => {
              return t.variableDeclaration('let', [
                t.variableDeclarator(n.id)
              ])
            })
          ]);

          statements.delete(node);
        }
      }
    }
  };
}

export default function({ types: t, template }) {
  return {
    visitor: {
      MemberExpression: {
        exit(path) {
        }
      }
    }
  };
}

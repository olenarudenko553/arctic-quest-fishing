const path = require('path');
const obfuscatingTransformer = require('react-native-obfuscating-transformer');

const servicesRoot = path.resolve(__dirname, 'services');

module.exports = obfuscatingTransformer({
  filter: filename => {
    const normalizedFile = path.normalize(filename);
    const relative = path.relative(servicesRoot, normalizedFile);

    return !relative.startsWith('..') && !path.isAbsolute(relative);
  },
  obfuscatorOptions: {
    compact: true,
    identifierNamesGenerator: 'hexadecimal',
    renameGlobals: false,
    stringArray: false,
  },
});

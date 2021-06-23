// module.exports = {
//     "roots": [
//       "<rootDir>/src"
//     ],
//     "testMatch": [
//       "tests/*.+(ts|tsx|js)",
//       "**/?(*.)+(spec|test).+(ts|tsx|js)"
//     ],
//     "transform": {
//       "^.+\\.(ts|tsx)$": "ts-jest"
//     },
//   }
// module.exports = {
//     preset: 'ts-jest',
//     testEnvironment: 'node',
//   };

//   {
//     "moduleFileExtensions": [
//       "ts",
//       "tsx",
//       "js"
//     ],
//     "transform": {
//       "^.+\\.(ts|tsx)$": "<rootDir>/preprocessor.js"
//     },
//     "testMatch": [
//       "**/__tests__/*.(ts|tsx)"
//     ]
//   }

  module.exports = {
    transform: {
      '^.+\\.ts?$': 'ts-jest'
    },
    testEnvironment: 'node',
    testRegex: '/tests/.*\\.(test|spec)?\\.(ts|tsx|js)$',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node']
  };
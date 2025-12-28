import antfu from '@antfu/eslint-config'

export default antfu({
  stylistic:  true,
  typescript: true,
  isInEditor: true,
  jsonc:      true,
}, {
  rules: {
    'antfu/if-newline':          'off',
    'antfu/no-top-level-await':  'off',
    'no-console':                'off',
    'style/no-floating-decimal': 'off',
    'no-sequences':              'off',
    'prefer-arrow-callback':     'off',
    'prefer-template':           'off',
    'style/key-spacing':         ['warn', { align: 'value' }],
    'style/no-multi-spaces':     'off',
    'style/quotes':              ['warn', 'single', { avoidEscape: true }],
  },
}, {
  files: ['*.md'],
  rules: { 'style/no-trailing-spaces': 'off' },
})

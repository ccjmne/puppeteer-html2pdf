import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: true,
}, {
  rules: {
    'no-console': 'off',
    'style/max-statements-per-line': ['error', { max: 2 }],
    'no-sequences': 'off',
  },
})

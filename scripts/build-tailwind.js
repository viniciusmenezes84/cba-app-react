const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const tailwind = require('@tailwindcss/postcss');

const input = path.join(__dirname, '..', 'src', 'tailwind.source.css');
const output = path.join(__dirname, '..', 'src', 'tailwind.generated.css');

postcss([tailwind()]).process(fs.readFileSync(input, 'utf8'), { from: input, to: output })
  .then(result => {
    // CRA's CSS minimizer cannot parse Tailwind 4's `calc(infinity * 1px)` radius.
    fs.writeFileSync(output, result.css.replaceAll('calc(infinity * 1px)', '9999px'));
    console.log(`Tailwind compilado: ${path.relative(process.cwd(), output)}`);
  })
  .catch(error => { console.error(error); process.exitCode = 1; });

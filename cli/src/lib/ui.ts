import chalk from 'chalk'

export const ui = {
  info:    (msg: string) => console.log(chalk.blue('ℹ'), msg),
  success: (msg: string) => console.log(chalk.green('✔'), msg),
  warn:    (msg: string) => console.log(chalk.yellow('⚠'), msg),
  error:   (msg: string) => console.error(chalk.red('✖'), msg),
  step:    (n: number, total: number, msg: string) =>
    console.log(chalk.dim(`[${n}/${total}]`), msg),
  header:  (msg: string) => console.log('\n' + chalk.bold.blue(msg) + '\n'),
}

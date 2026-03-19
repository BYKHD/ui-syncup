import chalk from 'chalk'

const pipe = chalk.white('│')

export const ui = {
  banner: (version: string) => {
    const title   = `  ✲  UI SyncUp  v${version}  `
    const tagline = `  A visual feedback and issue tracking platform  `
    const width   = Math.max(title.length, tagline.length)
    const pad     = (s: string) => s + ' '.repeat(width - s.length)

    console.log(chalk.white('╔' + '═'.repeat(width) + '╗'))
    console.log(
      chalk.white('║') +
      '  ' + chalk.white('✲') + '  ' + chalk.bold.white('UI SyncUp') + '  ' + chalk.dim(`v${version}`) +
      ' '.repeat(width - title.length + 2) +
      chalk.white('║')
    )
    console.log(chalk.white('╠' + '─'.repeat(width) + '╣'))
    console.log(
      chalk.white('║') +
      chalk.dim(pad(tagline)) +
      chalk.white('║')
    )
    console.log(chalk.white('╚' + '═'.repeat(width) + '╝'))
  },

  header: (msg: string) => {
    console.log(' ')
    console.log(chalk.cyan('⚙︎') + ' ' + chalk.bold.white(msg))
    console.log(pipe)
  },

  step: (n: number, total: number, msg: string) => {
    console.log(chalk.magenta('◆') + '  ' + chalk.bold.magenta(`Step ${n} of ${total}`))
    console.log(pipe + '  ' + chalk.white(msg))
  },

  info:    (msg: string) => console.log(pipe + '  ' + '🚀' + ' ' + chalk.blue(msg)),
  success: (msg: string) => console.log(pipe + '  ' + '✨' + ' ' + chalk.green(msg)),
  warn:    (msg: string) => console.log(pipe + '  ' + '⚠️ ' + chalk.yellow(msg)),
  error:   (msg: string) => console.error(pipe + '  ' + '🚨' + ' ' + chalk.red(msg)),
}

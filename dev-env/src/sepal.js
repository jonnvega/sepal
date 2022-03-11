#!/usr/bin/node

import {program, Option} from 'commander'
import {showStatus, exit} from './utils.js'
import {build} from './build.js'
import {start} from './start.js'
import {stop} from './stop.js'
import {restart} from './restart.js'
import {logs} from './logs.js'
import {shell} from './shell.js'
import {log} from './log.js'
import {npmUpdate} from './npm-update.js'
import {npmInstall} from './npm-install.js'

const main = async () => {
    process.on('SIGINT', () => exit({interrupted: true}))

    program.exitOverride()

    program
        .name('sepal')
        .description('CLI to manage SEPAL modules')
        .version('1.0.0')
    
    program.command('status')
        .description('Show modules status')
        .option('-d, --dependencies', 'Show dependencies too')
        .option('-x, --extended', 'Include health information')
        .option('-bd, --build-dependencies', 'Show build dependencies')
        .option('-dd, --direct-dependencies', 'Show direct dependencies')
        .option('-id, --inverse-dependencies', 'Show inverse dependencies')
        .argument('[module...]', 'Modules to show')
        .action(showStatus)
    
    program.command('build')
        .description('Build modules')
        .option('-nc, --no-cache', 'No cache')
        .option('-r, --recursive', 'Recursive')
        .option('-v, --verbose', 'Verbose')
        .option('-q, --quiet', 'Quiet')
        .argument('[module...]', 'Modules to build')
        .action(build)
    
    program.command('stop')
        .description('Stop modules')
        .option('-d, --dependencies', 'Stop dependencies too')
        .option('-v, --verbose', 'Verbose')
        .option('-q, --quiet', 'Quiet')
        .argument('[module...]', 'Modules to stop')
        .action(stop)
    
    program.command('start')
        .description('Start modules')
        .option('-d, --dependencies', 'Start dependencies too', true)
        .option('-v, --verbose', 'Verbose')
        .option('-q, --quiet', 'Quiet')
        .option('-l, --show-logs', 'Show logs')
        // .option('-nw, --no-wait', 'Don\'t wait for healthy status.')
        .argument('[module...]', 'Modules to start')
        .action(start)
    
    program.command('restart')
        .description('Restart modules')
        .option('-d, --dependencies', 'Restart dependencies too')
        .option('-v, --verbose', 'Verbose')
        .option('-q, --quiet', 'Quiet')
        .option('-l, --show-logs', 'Show logs')
        .argument('[module...]', 'Modules to start')
        .action(restart)
    
    program.command('logs')
        .description('Show module log')
        .option('-s, --since <time>', 'Since relative or absolute time')
        .option('-u, --until <time>', 'Until relative or absolute time')
        .option('-f, --follow', 'Follow')
        .argument('[module...]', 'Modules')
        .action(logs)
    
    program.command('shell')
        .description('Start module shell')
        .option('-r, --root', 'Start as root')
        .argument('<module>', 'Module')
        .action(shell)

    program.command('npm-update')
        .description('Update npm modules')
        .option('-c, --check', 'Check packages to update')
        .addOption(new Option('-t, --target <target>', 'Update target').choices(['patch', 'minor', 'latest']))
        .argument('[module...]', 'Modules to update')
        .action(npmUpdate)

    program.command('npm-install')
        .description('Install npm modules')
        .argument('[module...]', 'Modules to install')
        .action(npmInstall)

    try {
        await program.parseAsync(process.argv)
        exit({normal: true})
    } catch (error) {
        if (!['commander.helpDisplayed', 'commander.help', 'commander.version', 'commander.unknownOption', 'commander.unknownCommand', 'commander.invalidArgument'].includes(error.code)) {
            exit({error})
        }
    }
}

main().catch(log.error)

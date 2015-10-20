// Project configuration.
module.exports = function(grunt) {
    grunt.initConfig({
        // Shell
        shell: {
            dynamoStart: {
                // ps -ax | grep dyna
                //  kill $(ps aux | grep 'dynamo' | awk '{print $2}')
                options: {
                    async: true,
                    stdout: true,
                    stderr: true
                },
                command: 'java -Djava.library.path=dynamodb/DynamoDBLocal_lib -jar dynamodb/DynamoDBLocal.jar -port 9090 -dbPath dynamodb/liveorange'
            }
        },
        // watch
        watch: {
            express: {
                files: ['**/*.js'],
                tasks: ['express:dev', 'notify:express'],
                options: {
                    spawn: false
                }
            }
        },
        // express
        express: {
            dev: {
                options: {
                    script: 'app.js'
                }
            }
        },
        // notify
        notify: {
            express: {
                options: {
                    title: 'Express Restarted',
                    message: 'Express have restarted'
                }
            }
        }
    });

    //Load Plugins
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-express-server');
    grunt.loadNpmTasks('grunt-shell-spawn');
    grunt.loadNpmTasks('grunt-notify');

    // # Before exit
    grunt.registerTask('beforeExit', function() {
        process.on('SIGINT', function() {
            grunt.log.writeln();
            grunt.log.writeln('Running before exit tasks [=');
            grunt.task.run(['shell:dynamoStart:kill']);
            grunt.task.current.async()();
        });
    });

    // # Default
    grunt.registerTask('dev', [
        'shell:dynamoStart',
        'express:dev',
        'beforeExit',
        'watch'
    ]);
};

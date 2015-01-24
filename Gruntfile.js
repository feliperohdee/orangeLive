// Project configuration.
module.exports = function (grunt) {
    grunt.initConfig({
        //uglify
        uglify: {
            options: {
                sourceMap: true
            },
            dist: {
                files: {
                    'client/dist/js/bundle.min.js': [
                        // App
                        'client/app/**/*.js'
                    ]
                }
            }
        },
        //cssmin
        cssmin: {
            dist: {
                files: {
                    'client/dist/css/bundle.min.css': [
                        // App
                        'client/app/css/directives.css'
                    ]
                }
            }
        },
        // htmlmin
        htmlmin: {
            dist: {
                options: {
                    removeComments: true,
                    collapseWhitespace: true
                },
                files: [{
                        expand: true,
                        cwd: 'client/app/views',
                        src: '**/*.html',
                        dest: 'client/dist/views'
                    }]
            }
        },
        // Shell
        shell: {
            lodash: {
                command: 'lodash include=each,extend,findIndex,uniq,sortBy,isArray,isFunction,isNumber,isEmpty -m'
            },
            rmDist: {
                command: 'rm -rf client/dist'
            },
            cpFontAwesome: {
                command: 'cp -r client/libs/components-font-awesome/fonts client/dist/fonts'
            },
            syncAssets: {
                command: 'aws s3 sync client/dist s3://beestatic/mailer/dist --delete --acl public-read --profile beeleds'
            },
            deploy: {
                command: 'eb deploy'
            }
        }
    });

    //Load Plugins
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-htmlmin');
    grunt.loadNpmTasks('grunt-shell');

    /*
     * Tasks
     */
    
    // # Lodash
    // - Make lodash
    grunt.registerTask('lodash', [
        'shell:lodash'
    ]);
    
    // # Make Assets 
    // - Remove Dist Folder
    // - Uglify JS
    // - Minify CSS
    // - Minify HTML
    // - Copy font awesome fonts
    grunt.registerTask('buildAssets', [
        'shell:rmDist',
        'uglify:dist',
        'cssmin:dist',
        'htmlmin:dist',
        'shell:cpFontAwesome'
    ]);
    
    // # Assets
    // - @buildAssets
    // - Sync with S3
    grunt.registerTask('assets', [
        'buildAssets',
        'shell:syncAssets'
    ]);
    
    // # Deploy
    // - @assets
    // - Deploy to EB
    grunt.registerTask('deploy', [
        'assets',
        'shell:deploy'
    ]);
};
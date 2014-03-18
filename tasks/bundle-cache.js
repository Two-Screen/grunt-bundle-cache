/**
 * Grunt module for inserting files into an HTML file as AngularJS cache.
 */
module.exports = function(grunt) {
    "use strict";
    var fs   = require('fs');
    var path = require('path');

    /**
     * Grunt bundlecache task.
     *
     * This task will bundle a list of files with a HTML file for AngularJS
     * to use as a cache for HTTP requests. The files will be injected at the
     * end of the HTML file as script tags with type `text/ng-template`.
     *
     * Configuration:
     *
     * This task is a multi task and supports targets. A list of `files`
     * can be specified per target as an Object with the key being the target
     * file and the value an Array containing a list of files to insert. The
     * files support the Grunt file expansion syntax.
     *
     * @example
     *     bundlecache: {
     *         build: {
     *             files: {
     *                 '_build/index.html': [
     *                      'app/js/**\/*.html',
     *                 ],
     *                 '_build/demo.html': [
     *                     'app/js/demo/**\/*.html',
     *                     'app/js/demo/**\/*.dust'
     *                 ]
     *             }
     *         }
     *     }
     */
    grunt.registerMultiTask('bundlecache', 'write-cache', function() {
        var options = this.options();

        if (!options.base)
            options.base = [];
        else if (typeof(options.base) === 'string')
            options.base = [options.base];

        if (!options.filters)
            options.filters = {};

        this.files.forEach(function(f) {
            bundlecache(f.dest, f.src, options);
            grunt.log.writeln("File " + f.dest.cyan + " updated with cache.");
        });
    });

    /**
     * Helper for embedding a list of files within an HTML file.
     *
     * All files are in the `files` Array are read and converted to script
     * tags with type `text/ng-template`. The tags are inserted in the HTML
     * at the end of the body.
     *
     * The destination file is written to disk when the script tags are
     * inserted.
     *
     * @param {String} destination      The destination file for the cache files
     * @param {Array} files             A list of files to include
     * @param {Object} options          Options
     * @return {String}                 The updated HTML
     */
    function bundlecache(destination, files, options) {
        var baseRe = options.base.map(function(base) {
            return new RegExp('^' + base);
        });

        // Check the destination path
        destination = path.resolve(destination);
        if (!fs.existsSync(destination) || !fs.lstatSync(destination).isFile()) {
            grunt.fail.warn('Destination path ' + destination + ' does not exist or is not a File.');
        }

        if (typeof(files) === 'string') files = [ files ];

        // Create a complete list of files
        files = files.reduce(function(all, template) {
            var files = grunt.file.expand(template);
            return all.concat(files);
        }, []);

        // Filter non-existing files and read the contents for each files
        var tags = files.filter(fs.existsSync).map(function(filePath) {
            var relPath = filePath;
            baseRe.forEach(function(re) {
                relPath = relPath.replace(re, '');
            });

            var content = grunt.file.read(filePath);

            var ext = path.extname(filePath);
            var filter = options.filters[ext];
            if (filter)
                content = filter(content);

            var s =
                '<script type="text/ng-template" id="' + relPath + '">\n' +
                    content +
                '\n</script>';
            return s;
        });

        // Insert the script tags into destination HTML file
        var html = grunt.file.read(destination);
        var idx = html.indexOf('</body>');
        html = html.slice(0, idx) + tags.join('\n') + html.slice(idx);
        grunt.file.write(destination, html);

        return html;
    }
};

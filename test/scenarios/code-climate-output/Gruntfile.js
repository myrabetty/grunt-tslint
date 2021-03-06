"use strict";

module.exports = function(grunt) {

    var cwd = process.cwd();
    grunt.file.setBase("../../..");
    grunt.loadTasks(".");
    grunt.file.setBase(cwd);

    grunt.initConfig({

        tslintCodeClimate: {
            stdout: {
                options: {
                    configuration: grunt.file.readJSON("tslint.json"),
                },
                files: {
                    src: ["*.ts"],
                },
            },
            JSONfile: {
                options: {
                    configuration: grunt.file.readJSON("tslint.json"),
                    outputFile: "tmp/outputJSONFile",
                    formatter: "json",
                    codeClimate: true,
                    codeClimateFile: "tmp/code-quality-report-JSON.json"
                },
                files: {
                    src: ["*.ts"],
                },
            },
            file: {
                options: {
                    configuration: grunt.file.readJSON("tslint.json"),
                    outputFile: "tmp/outputFile",
                    codeClimate: true,
                    codeClimateFile: "tmp/code-quality-report.json"
                },
                files: {
                    src: ["*.ts"],
                },
            }
        },

    });

    grunt.registerTask("default", ["tslintCodeClimate"]);

};

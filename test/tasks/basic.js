var expect = require('chai').expect;
var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var ChildProcess = require('cover-child-process').ChildProcess;
var Blanket = require('cover-child-process').Blanket;
var childProcess = new ChildProcess(new Blanket());

var gruntExec = 'node ' + path.resolve('node_modules/grunt-cli/bin/grunt --no-color');

var execGrunt = function (parameters, callback) {
    parameters = parameters || [];
    childProcess.exec([gruntExec].concat(parameters).join(' '), {
        cwd: path.resolve(__dirname)
    }, callback);
};

var fixture = function (file, scenario) {
    var dir = path.join(__dirname, '../../test', (scenario ? 'scenarios/' + scenario : 'fixtures'));
    return path.join(dir, file);
};

describe('grunt-tslint on a single file', function () {
    it('should find errors in single invalid .ts file', function (done) {
        execGrunt('--gruntfile ' + fixture('Gruntfile.js', 'single-error-file'), function (error, stdout, stderr) {
            expect(stdout).to.match(/1 error and 0 warnings in 1 file/);
            done();
        });
    });

    it('should not find errors in a single valid .ts file', function (done) {
        execGrunt('--gruntfile ' + fixture('Gruntfile.js', 'single-valid-file'), function (error, stdout, stderr) {
            expect(stdout).to.match(/1 file lint free/);
            done();
        });
    });

    it('should find errors in single invalid .ts file that requires type checking', function (done) {
        execGrunt('--gruntfile ' + fixture('Gruntfile.js', 'requires-type-checking'), function (error, stdout, stderr) {
            expect(stdout).to.match(/1 error and 0 warnings in 1 file/);
            done();
        });
    });
});

describe('grunt-tslint on multiple files', function () {

    var scenario = 'multi-error-files',
        tmpDir = fixture('tmp', scenario),
        tmpOutput;

    beforeEach(function (next) {
        mkdirp(tmpDir, next);
    });

    afterEach(function (next) {
        rimraf(tmpDir, next);
    });

    it('should find errors in multiple invalid .ts files', function (done) {

        execGrunt([
            '--gruntfile ', fixture('Gruntfile.js', scenario),
            'tslint:stdout'
        ].join(' '), function (error, stdout, stderr) {

            expect(stdout).to.contain('Task "tslint:stdout" failed');

            tmpOutput = stdout.split('\n')
                .filter(function (line) {
                    var isOutputLine = (line.indexOf('>> ') === 0);
                    var isSummaryLine = /[0-9]+ error(s?) and [0-9]+ warning(s?) in [0-9]+ file(s?)/.test(line);
                    return isOutputLine && !isSummaryLine;
                })
                .map(function (line) {
                    return line.substr(3);
                })
                .join('\n');

            done();
        });

    });

    it('should write output of multiple invalid .ts files into a single outputFile', function (done) {

        expect(tmpOutput).to.not.be.empty;

        execGrunt([
            '--gruntfile ', fixture('Gruntfile.js', scenario),
            'tslint:file'
        ].join(' '), function (error, stdout, stderr) {
            var outputFileContents = fs.readFileSync(path.join(tmpDir, 'outputFile')).toString().trim();
            expect(outputFileContents).to.be.equal(tmpOutput);
            done();
        });

    });
});


describe('grunt-tslint on multiple file with with code climate enabled.', function () {

    var scenario = 'code-climate-output',
        tmpDir = fixture('tmp', scenario),
        expectedContent = "[{\"endPosition\":{\"character\":15,\"line\":0,\"position\":15},\"failure\":\"' should be \\\"\",\"fix\":{\"innerStart\":9,\"innerLength\":6,\"innerText\":\"\\\"abcd\\\"\"},\"name\":\"errorFile1.ts\",\"ruleName\":\"quotemark\",\"ruleSeverity\":\"error\",\"startPosition\":{\"character\":9,\"line\":0,\"position\":9}}]\n[{\"endPosition\":{\"character\":21,\"line\":3,\"position\":90},\"failure\":\"Use of debugger statements is forbidden\",\"name\":\"errorFile2.ts\",\"ruleName\":\"no-debugger\",\"ruleSeverity\":\"error\",\"startPosition\":{\"character\":12,\"line\":3,\"position\":81}},{\"endPosition\":{\"character\":16,\"line\":4,\"position\":107},\"failure\":\"forbidden eval\",\"name\":\"errorFile2.ts\",\"ruleName\":\"no-eval\",\"ruleSeverity\":\"error\",\"startPosition\":{\"character\":12,\"line\":4,\"position\":103}}]";

    it('should write output of multiple invalid .ts files into a single outputFile in json format', function (done) {
        execGrunt([
            '--gruntfile ', fixture('Gruntfile.js', scenario),
            'tslint:file'
        ].join(' '), function (error, stdout, stderr) {
            var outputFileContents = fs.readFileSync(path.join(tmpDir, 'outputFile')).toString().trim();
            expect(outputFileContents).to.be.equal(expectedContent);
            done();
        });
    });
});

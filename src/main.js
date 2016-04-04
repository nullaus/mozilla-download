import { ArgumentParser } from 'argparse';
import debug from 'debug';
import detectOS from './detectos';
import detectURL from './detecturl';
import download from './download';
import extract from './extract';
import { readdir } from 'mz/fs';
import * as buildinfo from './moz_build_info';

debug = debug('mozilla-download/main');

let parser = new ArgumentParser({
  version: require('../package').version,
  description: 'Utility to download gecko builds from taskcluster index',
  addHelp: false
});

parser.addArgument(['--product'], {
  type: 'string',
  help: 'Name for gecko build (ie b2g-desktop, mulet)',
  defaultValue: 'b2g-desktop'
});

parser.addArgument(['--os'], {
  type: 'string',
  help: 'OS to download build for (ie linux-x86_64)',
  defaultValue: detectOS()
});

parser.addArgument(['--branch'], {
  type: 'string',
  help: 'Release version (ie mozilla-central)',
  defaultValue: 'mozilla-central'
});

parser.addArgument(['--debug'], {
  type: 'int',
  defaultValue: 0
});

parser.addArgument(['--file-suffix'], {
  type: 'string',
  help: 'File extensions for extraction of files (ie .tar.bz2, .dmg, .zip)',
  dest: 'fileSuffix'
});

parser.addArgument(['dest'], {
  type: 'string'
});

function getFolderForProduct(product) {
  const productFolderName = {
    'b2g-desktop': 'b2g',
    'firefox': 'firefox',
    'mulet': 'firefox'
  };

  return productFolderName[product] || null;
}

export default async function main(args=parser.parseArgs()) {
  try {
    // Bail if thing exists
    try {
      let contents = await readdir(args.dest);
      if (contents &&
          contents.length &&
          contents.indexOf(getFolderForProduct(args.product)) !== -1) {
        // We have dest dir and it has contents
        debug('Found', args.product, 'at dest', args.dest);
        return;
      }
    } catch (error) {
    }

    debug('No b2g found. Will download to', args.dest);
    let url = await detectURL(args);
    debug('Artifact url', url);
    let path = await download(url, args);
    debug('Download to', path);
    let product = args.product;
    let extractOpts = { source: path, dest: args.dest, product: product };
    if (args.fileSuffix) {
      let parts = args.fileSuffix.split('.');
      extractOpts.filetype = parts[parts.length - 1];
    } else {
      // They want the regular old build archive.
      let os = args.os;
      extractOpts.filetype = buildinfo.archiveFiletype(os, product);
    }

    await extract(extractOpts);
  } catch (error) {
    console.error(error.toString());
  }
}

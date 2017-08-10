#!/bin/bash

version=`npm version patch`
npm publish --access public --verbose
git commit -a -m "release $version"
git push

git tag $version
git push --tag

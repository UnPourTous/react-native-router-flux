#!/bin/bash

version=`npm version patch`
# npm publish --access public --verbose
git commit -a -m "$version"
git push
git push --tag

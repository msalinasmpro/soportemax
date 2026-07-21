#!/bin/bash
HASH=$(git rev-parse --short HEAD)
sed -i "s|styles.css?v=[^\"']*|styles.css?v=$HASH|" index.html
sed -i "s|main.js?v=[^\"']*|main.js?v=$HASH|" index.html
echo "Version bumped to $HASH"

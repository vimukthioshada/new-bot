#!/bin/bash
# Ensure Puppeteer cache is properly managed
if [[ ! -d $PUPPETEER_CACHE_DIR ]]; then
    echo "...Creating Puppeteer cache directory"
    mkdir -p $PUPPETEER_CACHE_DIR
    chmod -R 777 $PUPPETEER_CACHE_DIR
fi

if [[ -d /opt/render/project/src/.cache/puppeteer/chrome ]]; then
    echo "...Copying Puppeteer cache from build cache"
    cp -R /opt/render/project/src/.cache/puppeteer/chrome/ $PUPPETEER_CACHE_DIR
fi

echo "...Storing Puppeteer cache in build cache"
mkdir -p /opt/render/project/src/.cache/puppeteer
cp -R $PUPPETEER_CACHE_DIR /opt/render/project/src/.cache/puppeteer/chrome/

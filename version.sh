#!/bin/bash

for dir in */ ; do
  if [ -f "$dir/package.json" ]; then
    echo "Installing standard-version in $dir"
    cd "$dir"
    npm install --save-dev standard-version
    cd ..
  fi
done

echo "✅ standard-version installed in all services!"

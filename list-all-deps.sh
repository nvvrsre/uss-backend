#!/bin/bash

output="all-dependencies.txt"
echo "" > "$output"

for dir in */ ; do
  if [ -f "$dir/package.json" ]; then
    echo "===============================" >> "$output"
    echo "Dependencies for $dir" >> "$output"
    echo "===============================" >> "$output"
    cd "$dir"
    npm install --silent
    npm ls --all >> "../$output"
    cd ..
    echo "" >> "$output"
  fi
done

echo "Dependency list saved to $output"

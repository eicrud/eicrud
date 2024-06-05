rm -rf test/cli-app &&
cd cli &&
npm remove -g @eicrud/cli && npm run compile ; npm i ./ && 
cd .. && 
npm i -g ./shared && 
cd test && 
npm i -g @nestjs/cli &&
nest new cli-app --skip-install --package-manager npm && 
cd cli-app && 
eicrud setup --skip-install mongo cli-app && 
eicrud generate -ms data service profile && 
eicrud generate cmd -ms data profile search && 
eicrud generate service sales && 
eicrud generate cmd sales search
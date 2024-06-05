rm -rf test/cli-app &&
npm remove -g @eicrud/cli && 
npm install -g verdaccio &&
rm -rf ./verdaccio/storage &&
nohup verdaccio --config ./verdaccio/config.yaml &

declare -a arr=("shared" "core" "db_mongo" "cli")

for i in "${arr[@]}"
do
    echo "publishing $i..." && cd $i && rm .npmrc ; echo @eicrud:registry=http://localhost:4873/ > .npmrc && echo //localhost:4873/:_authToken=fooBar >> .npmrc && npm i && npm run publish:package && cd ..
done

cd test && 
npm i -g @nestjs/cli &&
nest new cli-app --skip-install --package-manager npm && 
cd cli-app && 
npm i -g @eicrud/cli &&
eicrud setup mongo cli-app && 
eicrud generate -ms data service profile && 
eicrud generate cmd -ms data profile search && 
eicrud generate service sales && 
eicrud generate cmd sales search &&
npm i &&
nest build
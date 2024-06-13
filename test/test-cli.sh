rm -rf test/cli-app &&
rm -rf ./verdaccio/storage &&
npm remove -g @eicrud/cli && 
npm install -g verdaccio &&
nohup verdaccio --config ./verdaccio/config.yaml &

declare -a arr=("shared" "core" "db_mongo" "cli")

for i in "${arr[@]}"
do
    echo "publishing $i..." && cd $i && rm .npmrc ; echo @eicrud:registry=http://localhost:4873/ > .npmrc && echo //localhost:4873/:_authToken=fooBar >> .npmrc && npm i && npm run compile && npm publish && cd .. 
done

cd test && 
npm i -g @nestjs/cli &&
nest new cli-app --skip-install --package-manager npm && 
cd cli-app && 
echo @eicrud:registry=http://localhost:4873/ > .npmrc && echo //localhost:4873/:_authToken=fooBar >> .npmrc &&
npm i -g ../../cli &&
eicrud -V &&
eicrud setup postgre cli-app && 
eicrud generate -ms data service profile && 
eicrud generate cmd -ms data profile search && 
eicrud generate service sales && 
eicrud generate cmd sales search &&
npm i &&
nest build
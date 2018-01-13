var config = {
    apiKey: "AIzaSyDq6PSY2L-ZvqlougBmVNBTxeRUeroH4D8",
    authDomain: "adminvoz-9f584.firebaseapp.com",
    databaseURL: "https://adminvoz-9f584.firebaseio.com",
    projectId: "adminvoz-9f584",
    storageBucket: "adminvoz-9f584.appspot.com",
    messagingSenderId: "189324485306"
};
firebase.initializeApp(config);

angular.module('voz', ['firebase', 'ngRoute'])
    .run(["$rootScope", 
        function($rootScope){
            const listenRootScope = $rootScope.$on("$routeChangeStart", function(event, toState) {
                if(location.href.substring(location.href.length-5,location.href.length-1)=="html" && screen.width <= 700)
                    document.location = "#!/mobile";
            });

        }
    ])
    .config(['$routeProvider',
        function ($routeProvider) {
            $routeProvider
                .when('/article/:id/:title', {
                    templateUrl: 'partials/article.html'
                })
                .when('/', {
                    templateUrl: 'partials/inicioDesktop.html'
                })
                .when('/mobile', {
                    templateUrl: 'partials/inicioMobile.html'
                })
                .otherwise({
                    redirectTo: '/'
                });
        }
    ])
    .directive("loadMore", function ($window) {
        var directive = {
            restrict: "A",
            link: function (scope, element, attr) {
                var d = document.documentElement;
                angular.element($window).bind('scroll', (e) => {
                    var totally = d.scrollHeight - d.clientHeight;
                    var actually = angular.element($window)[0].scrollY;
                    if (actually + 450 >= totally) {
                        scope.$apply(attr.loadMore);
                    }
                });
            }
        };
        return directive;
    })
    .factory('articles', function ($q, $firebaseArray, $firebaseObject) {
        return {
            getContents: () => $q((resolve, reject) => {
                $firebaseArray(
                    firebase.database().ref().child("contentManager/public/")).$loaded(function (data) {
                        if (data) {
                            resolve(data);
                        } else {
                            reject("Error load Data");
                        }
                    });
            }),
            getContentsLimit: () => $q((resolve, reject) => {
                $firebaseArray(
                    firebase.database().ref().child("contentManager/public/")
                        .orderByKey().limitToLast(7)).$loaded((data) => {
                            if (data) {
                                resolve(data);
                            } else {
                                reject("Error load Data");
                            }
                        });
            }),
            getContentsLimitKey: (key) => $q((resolve, reject) => {
                $firebaseArray(
                    firebase.database().ref().child("contentManager/public/")
                        .orderByKey().limitToLast(7).endAt(key)).$loaded((data) => {
                            if (data) {
                                resolve(data);
                            } else {
                                reject("Error load Data");
                            }
                        });
            }),
            getContent: (key) => $q((resolve, reject) => {
                $firebaseObject(
                    firebase.database().ref().child("contentManager/all/" + key))
                        .$loaded((data) => {
                            if (data) {
                                resolve(data);
                            } else {
                                reject("Error load Data");
                            }
                        });
            })
        }
    })
    .factory('images', function ($q) {
        return (name) => $q((resolve, reject) => {
            var downloadTask = firebase.storage().ref().child("publisher/voz/" + name);
            downloadTask.getDownloadURL().then(function (url) {
                resolve(url);
            }).catch(function (error) {
                reject(error);
            });
        });
    })
    .factory('assignImage', ($q, images) => {
        return (articlesList) => $q((resolve, reject) => {
            var result = [];
            var arrayPromises = [];
            angular.forEach(articlesList, function (value) {
                if (value.typeTemplate == 1 || value.typeTemplate == 3)
                    arrayPromises.push(
                        images(value.$id + ".png")
                            .then((imageUrl) => {
                                value.image = imageUrl;
                                result.push(value);
                            })
                            .catch((error) => {
                                throw (error);
                            })
                    );
                else result.push(value);
            });
            $q.all(arrayPromises)
                .then(() => {
                    resolve(result);
                })
                .catch((error) => {
                    reject(error);
                });
        })
    })
    .controller('loadArticles', function (articles, assignImage, $location) {
        var vm = this;
        vm.items = [];

        vm.moreContents = function () {
            if (vm.busy || vm.completed) return vm.busy;
            vm.busy = true;
            if (vm.items.length == 0) {
                articles.getContentsLimit()
                    .then((data) => {
                        console.log(data)
                        vm.lastestArticle = data[0].$id;
                        if (data.length != 0)
                            return assignImage(data);
                        return [];
                    })
                    .then((data) => {
                        vm.items = data;
                        if (data.length == 7) {
                            vm.busy = false;
                        } else vm.completed = true;
                    });
            } else {
                articles.getContentsLimitKey(vm.lastestArticle)
                    .then((data) => {
                        vm.lastestArticle = data[0].$id;
                        return assignImage(data)
                    })
                    .then((data) => {
                        data.splice(data.length - 1);
                        vm.items = vm.items.concat(data);
                        if (!data.length == 0) vm.busy = false;
                        else vm.completed = true;
                        return vm.busy;
                    });
            }
            return vm.busy;
        };
        vm.moreContents();

        vm.goArticle = (id, title) => {
            $location.path( "/article/" + id + "/" + title);
        };
    })
    .controller('articleCtrl', function ($sce, articles, images, $routeParams) {
        var vm = this;
        articles.getContent($routeParams.id)
        .then((article) => {
            vm.article = article;
            vm.article.template.texto = $sce.trustAsHtml(article.template.texto);
            });
        images($routeParams.id + ".png")
            .then((imageUrl) => {
                vm.image = imageUrl;
            })
    }); 
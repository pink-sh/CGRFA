var APPLICATION_NAME = 'AqGR';
var BASE_URL = "http://168.202.54.210:8080/CGRFA/";
var DEBUG = false;
var TITLE = "Aquatic Genetic Resources Questionnaire Tools"
//var BASE_URL = "http://168.202.54.210/cgrfa/";


if (typeof String.prototype.startsWith != 'function') {
  // see below for better implementation!
  String.prototype.startsWith = function (str){
    return this.indexOf(str) === 0;
  };
}

(function(angular) {
  'use strict';

  angular.module('cgrfa', ['restangular', 'ngRoute', 'ui.bootstrap', 'ngSanitize', 'ngMaterial', 'blueimp.fileupload', 'mgcrea.ngStrap', 'angularjs-dropdown-multiselect', 'textarea-fit'])
  .config(['$routeProvider', '$locationProvider',
		function($routeProvider, $locationProvider) {
			$routeProvider
				.when('/', {
					templateUrl: 'views/main.html',
					controller: 'homeController',
					controllerAs: 'home'
				})
				.when('/form/:surveyID', {
					templateUrl: 'views/form-tabular.html',
					controller: 'formController',
					controllerAs: 'form'
				})
				.when('/newForm/', {
					templateUrl: 'views/newform.html',
					controller: 'formController',
					controllerAs: 'form'
				})
				.when('/test/', {
					templateUrl: 'views/test.html',
					controller: 'testController',
					controllerAs: 'test'
				})
				.when('/list/', {
					templateUrl: 'views/list.html',
					controller: 'listSurveyController',
					controllerAs: 'list'
				})
				.when('/upload/', {
					templateUrl: 'views/upload.html',
					controller: 'uploadController',
					controllerAs: 'upload'
			});

		$locationProvider.html5Mode(true);
  }])
  .config( 
	function(RestangularProvider) {
		RestangularProvider.setBaseUrl( BASE_URL );
		RestangularProvider.setRequestSuffix('/');
   })
  .config([
            '$httpProvider', 'fileUploadProvider',
            function ($httpProvider, fileUploadProvider) {
                delete $httpProvider.defaults.headers.common['X-Requested-With'];
                fileUploadProvider.defaults.redirect = window.location.href.replace(
                    /\/[^\/]*$/,
                    '/cors/result.html?%s'
                );
                angular.extend(fileUploadProvider.defaults, {
                	disableImageResize: /Android(?!.*Chrome)|Opera/
                    	.test(window.navigator.userAgent),
                	maxFileSize: 5000000,
                	acceptFileTypes: /(\.|\/)(gif|jpe?g|png|pdf|PDF)$/i,
                	sequentialUploads : true
                });
            }])
  .run(function($rootScope, Restangular) {
	Restangular.addRequestInterceptor(function(element) {
		$("#wait-loading").css("visibility", "visible");

	});
	Restangular.addResponseInterceptor(function(data) {
		$("#wait-loading").css("visibility", "hidden");
		return data;
	});
  })
  .controller('MainCtrl', ['$route', '$routeParams', '$location',
	  function($route, $routeParams, $location) {
	    this.$route = $route;
	    this.$location = $location;
	    this.$routeParams = $routeParams;
	}])

  .controller('listSurveyController', ['$route', '$routeParams', '$location', '$scope', '$mdDialog', '$http', 'Restangular',
	  function($route, $routeParams, $location, $scope, $mdDialog, $http, Restangular) {
	    Restangular.one('getList/').get().then(function(response) {
	    	var scopeArray = [];
	    	$scope.reportLink = BASE_URL + 'statistics/pdf/';
	    	for (var i = 0; i < response.length; i++) {
	    		var singleSurvey = {};
	    		singleSurvey.id = response[i].id;
	    		singleSurvey.preparedBy = response[i].preparedBy;
	    		singleSurvey.date = $.format.date(response[i].date, "dd/MM/yyyy");
	    		singleSurvey.country = response[i].country.nameEn;
	    		singleSurvey.countryIso2 = response[i].country.iso2.toLowerCase();
	    		if (response[i].originalPDF != undefined && response[i].originalPDF != null && response[i].originalPDF != '') {
	    			singleSurvey.file = BASE_URL + "getFile/" + response[i].originalPDF;
	    		} else {
	    			singleSurvey.file = null;
	    		}
	    		singleSurvey.overall = response[i].overallStatus;
	    		if (singleSurvey.overall == 0) {
	    			singleSurvey.bulletImage = "img/bullet-red.png";
	    		} else if (singleSurvey.overall == 1) {
	    			singleSurvey.bulletImage = "img/bullet-yellow.png";
	    		} else if (singleSurvey.overall == 2) {
	    			singleSurvey.bulletImage = "img/bullet-green.png";
	    		}

	    		singleSurvey.rejected = response[i].rejected;
	    		singleSurvey.accepted = response[i].accepted;
	    		singleSurvey.underRevision = response[i].underRevision;
	    		singleSurvey.tooltip = "Number of: <br>Rejected=" + response[i].rejected + "<br>Under Revision=" + response[i].underRevision + "<br>Accepted=" + response[i].accepted
	    		scopeArray.push(singleSurvey);
	    	}
	    	if (scopeArray.length > 0) {
	    		$scope.listOfSurvey = scopeArray;
	    	}
	    });
	}])
  .controller('formController', ['$route', '$routeParams', '$location', '$scope', '$mdDialog', '$http', 'Restangular',
	function($route, $routeParams, $location, $scope, $mdDialog, $http, Restangular) {
		var surveyID = $routeParams.surveyID;
		var restMethod = "";
		var emptyForm = false;
		if (surveyID == undefined || surveyID == null || surveyID == "") {
			restMethod = 'getForm/';
			emptyForm = true;
		} else {
			restMethod = 'getForm/' + surveyID;
		}
		Restangular.one(restMethod).get().then(function(response) {
			var questionTypes = response['questionType'];
			if (window[APPLICATION_NAME] == undefined) {
				window[APPLICATION_NAME] = {};
			}
			
			window[APPLICATION_NAME].response = response['questions'];
			window[APPLICATION_NAME].cList = response['controlledLists'];
			window[APPLICATION_NAME].questionStatus = buildStatusList(response['questions']);
			window[APPLICATION_NAME].countries = buildCountries();
			window[APPLICATION_NAME].answers = {};
			window[APPLICATION_NAME].tables = {};
			$scope.Answers = window[APPLICATION_NAME].answers;
			$scope.headers = response['headers'];
			/*FOR DEBUG*/
			window[APPLICATION_NAME].headers = $scope.headers;
			/*END FOR DEBUG*/
			$scope.countries = window[APPLICATION_NAME].countries;
			$scope.Species = self.species = loadAll();
			$scope.questionStatus = window[APPLICATION_NAME].questionStatus;
			$scope.questions = rebuildResponse(response['questions'], response['controlledLists']);
			$scope.controlledLists = response['controlledLists'];

			$scope.multipleSelectSettings = {
			    scrollableHeight: '10px',
			    scrollable: true
			};

			$scope.debug = DEBUG;
		}, function errorCallback() {
				$("#wait-loading").css("visibility", "hidden");
			  	$mdDialog.show(
			      $mdDialog.alert()
			        .title('Error')
			        .content('Ooopss... There was an error on the server...')
			        .ariaLabel('Alert Dialog Demo')
			        .ok('Got it!')
			    );
		});

		$scope.addRow = function(table, row) {
			if (window[APPLICATION_NAME].tables[table] == undefined || window[APPLICATION_NAME].tables[table] == null) {
				window[APPLICATION_NAME].tables[table] = 0;
			} else {
				window[APPLICATION_NAME].tables[table] = window[APPLICATION_NAME].tables[table] + 1;
			}
			var originalRow = window[APPLICATION_NAME].response[table-1].tables[0].matrix[row];
			var newRow = $.extend(true,{},originalRow);
			for (var cell in newRow.cells) {
				for (var field in newRow.cells[cell].fields) {
					var htmlId = getNewID(newRow.cells[cell].fields[field]['htmlId'], table);
					newRow.cells[cell].fields[field]['htmlId'] = htmlId;
					newRow.cells[cell].fields[field].value = null;
					delete newRow.cells[cell].fields[field].renderDropDown;
					delete newRow.cells[cell].fields[field].renderCheckBox;
					if (newRow.cells[cell].fields[field].type == 3) {
						newRow.cells[cell].fields[field].renderCheckBox = buildCheckBox(newRow.cells[cell].fields[field], window[APPLICATION_NAME].cList);
					} else if (newRow.cells[cell].fields[field].type == 5) {
						newRow.cells[cell].fields[field].renderDropDown = buildDropdown(newRow.cells[cell].fields[field], window[APPLICATION_NAME].cList);
					} else if (newRow.cells[cell].fields[field].type == 6) {
						window[APPLICATION_NAME].answers[htmlId] = buildSelectedBox(newRow.cells[cell].fields[field]);
					}
					if (newRow.cells[cell].fields[field].type != 3 && newRow.cells[cell].fields[field].type != 6) {
						window[APPLICATION_NAME].answers[htmlId] = newRow.cells[cell].fields[field].value;
					}
				}
			}

			$scope.questions[table-1].tables[0].matrix.splice(row+1, 0, newRow);
		};
		$scope.removeRow = function(ev, table, row) {
			var body = angular.element(document.body);
			var confirm = $mdDialog.confirm()
		      .title('Do you really want to delete this row?')
		      .content('If you delete this row you wont be able to recover it')
		      .ariaLabel('Lucky day')
		      .ok('Please do it!')
		      .cancel('Please No')
		    $mdDialog.show(confirm).then(function() {
		    	for (var i = 0; i < $scope.questions[table-1].tables[0].matrix[row].cells.length; i++) {
		    		var cell = $scope.questions[table-1].tables[0].matrix[row].cells[i];
		    		for (var j = 0; j < cell.fields.length; j++) {
		    			var htmlId = cell.fields[j].htmlId;
		    			delete window[APPLICATION_NAME].answers[htmlId];
		    		}
		    	}
		      	$scope.questions[table-1].tables[0].matrix.splice(row, 1);
		    });
		}

		$scope.selectedTypeAheadValue = function(a, b, c, id) {
			$scope.Answers[id] = a.value;
		}

		function loadAll() {
    		var species = [];
    		for (var index in window[APPLICATION_NAME].cList[15]) {
    			species.push({'value' : window[APPLICATION_NAME].cList[15][index]['key'], 'display' : window[APPLICATION_NAME].cList[15][index]['text_e']});
    		}
    		return species.sort();
    	};

    	$scope.simulateKeyPress = function(id) {
    		var textArea = angular.element(id);
			var str = textArea.value;
		    var cols = textArea.cols;

		    var linecount = 0;
		    $A(str.split("\n")).each( function(l) {
		      linecount += Math.ceil( l.length / cols ); // take into account long lines
		    } )
		    textArea.rows = linecount + 1;
		}

    	$scope.dateOptions = {
		    formatYear: 'yy',
		    startingDay: 1
		};

		$scope.formats = ['dd-MMMM-yyyy', 'yyyy/MM/dd', 'dd.MM.yyyy', 'shortDate'];
		$scope.format = $scope.formats[0];

		$scope.postSurvey = function() {
			if (!emptyForm) {
				var POST_URL = BASE_URL + 'SaveSurvey';
		        $http({
		            method : 'POST',
		            url : POST_URL,
		            data : {'survey' : surveyID, 'headers' : $scope.headers, 'answers' : $scope.Answers, 'status' : $scope.questionStatus},
		            headers: {'Content-Type': 'application/json'}
		        }).success(function() {
		        	$mdDialog.show(
				      $mdDialog.alert()
				        .title('Saved')
				        .content('The form has been saved in the database')
				        .ariaLabel('Alert Dialog Demo')
				        .ok('Thanks!')
				    );
		        }).error(function() {
		        	$mdDialog.show(
				      $mdDialog.alert()
				        .title('Error')
				        .content('Ooopss... There was an error on the server...')
				        .ariaLabel('Alert Dialog Demo')
				        .ok('Got it!')
				    );
		        });
		    } else {
		    	var POST_URL = BASE_URL + 'SaveNewHtmlSurvey';
		    	$http({
		            method : 'POST',
		            url : POST_URL,
		            data : {'headers' : $scope.headers, 'answers' : $scope.Answers},
		            headers: {'Content-Type': 'application/json'}
		        }).success(function() {
		        	$mdDialog.show(
				      $mdDialog.alert()
				        .title('Saved')
				        .content('The form has been saved in the database')
				        .ariaLabel('Alert Dialog Demo')
				        .ok('Thanks!')
				    ).then(function() {$location.path('/list');});
		        }).error(function() {
		        	$mdDialog.show(
				      $mdDialog.alert()
				        .title('Error')
				        .content('Ooopss... There was an error on the server...')
				        .ariaLabel('Alert Dialog Demo')
				        .ok('Got it!')
				    );
		        });
		    }
	    }
	}
  ])	
  .controller('uploadController', function($scope, $http, $filter, $window) {

  })	
  .controller('homeController', function($scope, $http, $filter, $window) {
  		$scope.title = TITLE;
  })
  .controller('testController', function($scope, $http, $filter, $window) {
  		$scope.example4model1 = []; 
  		$scope.example4model2 = [];
  		$scope.example4data = [ {id: 1, label: "David"}, {id: 2, label: "Jhon"}, {id: 3, label: "Danny"}];
  })
  .controller('FileDestroyController', [
            '$scope', '$http',
            function ($scope, $http) {
                var file = $scope.file,
                    state;
                if (file.url) {
                    file.$state = function () {
                        return state;
                    };
                    file.$destroy = function () {
                        state = 'pending';
                        return $http({
                            url: file.deleteUrl,
                            method: file.deleteType
                        }).then(
                            function () {
                                state = 'resolved';
                                $scope.clear(file);
                            },
                            function () {
                                state = 'rejected';
                            }
                        );
                    };
                } else if (!file.$cancel && !file._index) {
                    file.$cancel = function () {
                        $scope.clear(file);
                    };
                }
            }
        ]);

})(window.angular);


function rebuildResponse(response, cList) {
	for (var k1 in response) {
		for (var k2 in response[k1].tables) {
			for (var k3 in response[k1].tables[k2].matrix) {
				for (var k4 in response[k1].tables[k2].matrix[k3]['cells']) {
					for (var k5 in response[k1].tables[k2].matrix[k3]['cells'][k4].fields) {
						var field = response[k1].tables[k2].matrix[k3]['cells'][k4].fields[k5];
						if (field.type == 1) {
							if (field.value == undefined || field.value == null || field.value == 'null') {
								response[k1].tables[k2].matrix[k3]['cells'][k4].fields[k5].value = "";
								window[APPLICATION_NAME].answers[field['htmlId']] = "";
							} else {
								window[APPLICATION_NAME].answers[field['htmlId']] = field.value;
							}
						}
						else if (field.type == 3) {
							response[k1].tables[k2].matrix[k3]['cells'][k4].fields[k5]['renderCheckBox'] = buildCheckBox(field, cList);
						}
						else if (field.type == 4) {
							if (field.value != undefined && field.value != null) {
								window[APPLICATION_NAME].answers[field['htmlId']] = new Date(field.value);
							} else {
								window[APPLICATION_NAME].answers[field['htmlId']] = "";
							}
						}
						else if (field.type == 5) {
							response[k1].tables[k2].matrix[k3]['cells'][k4].fields[k5]['renderDropDown'] = buildDropdown(field, cList);
							window[APPLICATION_NAME].answers[field['htmlId']] = field['value'];
						}
						else if (field.type == 6) {
							window[APPLICATION_NAME].answers[field['htmlId']] = buildSelectedBox(field);
						}
						else if (field.type == 9) {
							var autoSugVal = "";
							var cListIndex = response[k1].tables[k2].matrix[k3]['cells'][k4].fields[k5]['controlledList'];
							for (var index in cList[cListIndex]) {
								var cListEntry = cList[cListIndex][index]
								if (cListEntry.key == response[k1].tables[k2].matrix[k3]['cells'][k4].fields[k5]['value']) {
									autoSugVal = cList[cListIndex][index]['text_e'];
									break;
								}
							}
							response[k1].tables[k2].matrix[k3]['cells'][k4].fields[k5]['original'] = autoSugVal;
							window[APPLICATION_NAME].answers[field['htmlId']] = field['value'];
						} else {
							window[APPLICATION_NAME].answers[field['htmlId']] = field['value'];
						}
					}
				}
			}
		}
		for (var k2 in response[k1].fields) {
			var field = response[k1].fields[k2];
			window[APPLICATION_NAME].answers[field['htmlId']] = field['value'];
		}
	}
	window[APPLICATION_NAME].debugResponse = response;
	return response;
}

function buildDropdown(field, cList) {
	var dropdown = [];
	for (var key in cList[field.controlledList]) {
		if (cList[field.controlledList][key]['key'] != undefined && field.value == cList[field.controlledList][key]['key']) {
			dropdown.push({'key' : cList[field.controlledList][key]['key'], 'value' : cList[field.controlledList][key]['text_e'], selected : true});
		} else {
			dropdown.push({'key' : cList[field.controlledList][key]['key'], 'value' : cList[field.controlledList][key]['text_e'], selected : false});
		}
	}
	return dropdown.sort(sort_by('value', false, parseInt));
}

function buildCheckBox(field, cList) {
	var checkbox = [];
	var counter = 0;
	for (var key in cList[field.controlledList]) {
		var htmlId = field.htmlId + '![counter==' + counter + ']';
		checkbox.push({'key' : parseInt(cList[field.controlledList][key]['key']), 'value' : cList[field.controlledList][key]['text_e'], 'id' : htmlId, selected : 0});
		window[APPLICATION_NAME].answers[htmlId] = 0;
		counter++;
	}
	if (field.value != undefined && field.value != null && field.controlledList > 0) {
		var splitSelected = field.value.split(",");
		for (var i = 0; i < splitSelected.length; i++) {
			for (var j = 0; j < checkbox.length; j++) {
				if (splitSelected[i] == checkbox[j]['key']) {
					checkbox[j]['selected'] = checkbox[j]['key'];
					window[APPLICATION_NAME].answers[checkbox[j]['id']] = parseInt(checkbox[j]['key']);
				}
			}
		}
	} else if (field.controlledList == 0) {
		if (field.value != null) {
			checkbox.push({'key' : parseInt(field.value), 'value' : field.text_e, 'id' : field.htmlId, selected : parseInt(field.default_value)});
			window[APPLICATION_NAME].answers[field.htmlId] = parseInt(field.value);
		} else {
			checkbox.push({'key' : parseInt(field.default_value), 'value' : field.text_e, 'id' : field.htmlId, selected : 'null'});
			window[APPLICATION_NAME].answers[field.htmlId] = 'null';
		}
	}
	return checkbox;
}

function buildSelectedBox(field) {
	var selected = [];
	if (field.value == undefined || field.value == null) {
		return selected;
	}
	var splittedSelectedValues = field.value.split(",");
	for (var i in splittedSelectedValues) {
		selected.push({'id' : splittedSelectedValues[i]});
	}
	return selected;
}

function buildStatusList(responses) {
	statusList = {};
	for (var idx in responses) {
		question = responses[idx];
		statusList[question['id']] = {'status' : question['status']};
	}
	return statusList;
}

function swapMenuColor(there) {
	$("#menu-contents").children().removeClass( "menu-item-selected" ).length;
	var parent = $("#"+there.parentNode.id);
	parent.addClass("menu-item-selected");
}

function cloneRow(row) {
	var jRow = $(row);
	var jClonedRow = jRow.clone(true);
	jClonedRow.find("input[type=text], textarea").val("");
	jClonedRow.find("md-radio-button").removeAttr("aria-checked");
	jRow.after(jClonedRow);
}

function buildCountries() {
	var countries = [];
	for (var index in window[APPLICATION_NAME]['cList'][16]) {
		countries.push({'id' : window[APPLICATION_NAME]['cList'][16][index]['key'], 'label' : window[APPLICATION_NAME]['cList'][16][index]['text_e']});
	}
	return countries.sort(compare);
}
function compare(a,b) {
  if (a.label < b.label)
     return -1;
  if (a.label > b.label)
    return 1;
  return 0;
}
var sort_by = function(field, reverse, primer){
   var key = primer ? 
       function(x) {return primer(x[field])} : 
       function(x) {return x[field]};
   reverse = !reverse ? 1 : -1;
   return function (a, b) {
       return a = key(a), b = key(b), reverse * ((a > b) - (b > a));
     } 
}

function getNewID(id, table) {
	var newId = "NEWROW";
	var splittedId = id.split("!");
	newId = newId + "[" + window[APPLICATION_NAME].tables[table] + "]";

	var oldId = "";
	if (splittedId[0] != undefined && splittedId[0] != null) {
		if (splittedId[0].startsWith("NEWROW")) {
			for (var i = 1; i < splittedId.length; i++) {
				oldId = oldId + splittedId[i] + "!";
			}
		} else {
			for (var i = 0; i < splittedId.length; i++) {
				oldId = oldId + splittedId[i] + "!";
			}
		}
		oldId = oldId.substring(0, oldId.length - 1); //remove last '!'
	}
	newId = newId + "!" + oldId;
	return newId;
}

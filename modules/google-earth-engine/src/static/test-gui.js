(function () {
  var createMap = function ( mapIndex ) {
    return new google.maps.Map(
      document.getElementById( 'map' + mapIndex ), {
        zoom           : 4,
        minZoom        : 3,
        maxZoom        : 15,
        center         : new google.maps.LatLng( 16.7794913, 9.6771556 ),
        gestureHandling: 'greedy'
      } )
  }
  
  var maps = [ createMap( 1 ), createMap( 2 ) ]
  google.maps.event.addListener( maps[ 0 ], 'bounds_changed', (function () {
    maps[ 1 ].setCenter( maps[ 0 ].getCenter() )
    maps[ 1 ].setZoom( maps[ 0 ].getZoom() )
  }) );
  google.maps.event.addListener( maps[ 1 ], 'bounds_changed', (function () {
    maps[ 0 ].setCenter( maps[ 1 ].getCenter() )
    maps[ 0 ].setZoom( maps[ 1 ].getZoom() )
  }) );
  
  maps[ 1 ].setCenter( maps[ 0 ].getCenter() )
  $( '#form' ).submit( function ( e ) {
    e.preventDefault()
    previewAutomaticMosaic( 1 )
    previewAutomaticMosaic( 2 )
  } )
  
  
  $( '#classifyForm' ).submit( function ( e ) {
    e.preventDefault()
    classify()
    return false
  } )
  
  $( '#exportMosaic' ).click( function ( e ) {
    e.preventDefault()
    exportMosaic( 'sepal' )
  } )
  
  $( '#exportAssetMosaic' ).click( function ( e ) {
    e.preventDefault()
    exportMosaic( 'gee' )
  } )
  
  $( '#sceneIdForm' ).submit( function ( e ) {
    e.preventDefault()
    previewManualMosaic( 1 )
    previewManualMosaic( 2 )
  } )
  
  
  $( '#sceneAreasForm' ).submit( function ( e ) {
    e.preventDefault()
    findSceneAreas()
  } )
  
  $( '#bestScenesForm' ).submit( function ( e ) {
    e.preventDefault()
    bestScenes()
  } )
  
  $( '#timeseriesForm' ).submit( function ( e ) {
    e.preventDefault()
    downloadTimeseries()
  } )
  
  
  $( '#dataSet' ).find( 'input' ).change( function () {
    if ( this.value === 'LANDSAT' ) {
      $( '#sensors' ).show()
    } else {
      $( '#sensors' ).hide()
    }
  } )
  
  var shape          = null
  var drawingManager = new google.maps.drawing.DrawingManager( {
    drawingControl       : true,
    drawingControlOptions: {
      position    : google.maps.ControlPosition.TOP_CENTER,
      drawingModes: [
        google.maps.drawing.OverlayType.POLYGON
      ]
    },
    polygonOptions       : {
      fillOpacity : 0,
      strokeWeight: 2
    }
  } );
  drawingManager.setMap( maps[ 0 ] );
  google.maps.event.addListener( drawingManager, 'overlaycomplete', function ( e ) {
    drawingManager.setDrawingMode( null );
    if ( shape !== null )
      shape.setMap( null )
    var newShape  = e.overlay;
    shape         = newShape
    newShape.type = e.type;
    google.maps.event.addListener( newShape, 'click', function () {
      shape.setMap( null )
      shape = null
    } );
  } )
  
  function createPolygon() {
    var polygon = []
    shape.getPath().forEach( function ( a ) {
      polygon.push( [ a.lng(), a.lat() ] )
    } )
    polygon.push( polygon[ 0 ] )
    return polygon
  }
  
  var fromDate = new Date()
  fromDate.setMonth( 0 )
  fromDate.setDate( 1 )
  var fromDatePicker = createDatePicker( $( '#from-date' )[ 0 ], fromDate )
  var toDatePicker   = createDatePicker( $( '#to-date' )[ 0 ], new Date() )
  $( '#target-day-of-year' ).val( dayOfYear() )
  
  function createAutomaticMosaic( mapIndex ) {
    var mosaic  = createMosaic( mapIndex )
    var sensors = []
    $( '#sensors' ).find( 'input:checked' ).each( function () {
      sensors.push( $( this ).attr( 'id' ) )
    } )
    mosaic.sensors  = sensors
    mosaic.fromDate = fromDatePicker.getDate().getTime()
    mosaic.toDate   = toDatePicker.getDate().getTime()
    mosaic.type     = 'automatic'
    return mosaic
  }
  
  function findSceneAreas() {
    var aoi   = createAoi()
    var query = {
      aoi    : JSON.stringify( aoi ),
      dataSet: $( 'input[name=dataSet]:checked' ).val()
    }
    $.getJSON( 'sceneareas', query, function ( data ) {
      $( '#sceneAreas' ).html( "<pre>" + JSON.stringify( data, null, 2 ) + "</pre>" )
    } )
  }
  
  function bestScenes() {
    var aoi   = createAoi()
    var query = {
      aoi                  : JSON.stringify( aoi ),
      dataSet              : $( 'input[name=dataSet]:checked' ).val(),
      fromDate             : fromDatePicker.getDate().getTime(),
      toDate               : toDatePicker.getDate().getTime(),
      targetDayOfYear      : $( '#target-day-of-year' ).val(),
      targetDayOfYearWeight: $( '#target-day-of-year-weight' ).val(),
      shadowTolerance      : $( '#shadow-tolerance' ).val(),
      hazeTolerance        : $( '#haze-tolerance' ).val(),
      greennessWeight      : $( '#greenness-weight' ).val()
    }
    $.getJSON( 'best-scenes', query, function ( data ) {
      var scenes = ''
      $.each( data, function ( i, scene ) {
        scenes += scene
        if ( i < scenes.length - 1 )
          scenes += '\n'
      } )
      $( '#sceneIds' ).val( scenes )
    } )
  }
  
  function previewAutomaticMosaic( mapIndex ) {
    postJson( 'preview', createAutomaticMosaic( mapIndex ) )
      .done( function ( data ) {
        $( '#response' ).html( JSON.stringify( data ) )
        renderMap( data.mapId, data.token, mapIndex )
      } )
  }
  
  function classify() {
    postJson( 'preview', {
        imageType      : 'CLASSIFICATION',
        tableName      : $( '#fusionTable' ).val(),
        classProperty  : $( '#classProperty' ).val(),
        imageToClassify: ($( '#sceneIds' ).val() ? createManualMosaic( 1 ) : createAutomaticMosaic( 1 ))
      }
    ).done( function ( data ) {
      $( '#response' ).html( JSON.stringify( data ) )
      renderMap( data.mapId, data.token, 1 )
    } )
  }
  
  function exportMosaic( destination ) {
    postJson( 'submit', {
      task  : task,
      module: destination === 'sepal' ? 'sepal.image.sepal_export' : 'sepal.image.asset_export',
      spec  : {
        task       : guid(),
        description: description,
        image      : $( '#sceneIds' ).val() ? createManualMosaic( 1 ) : createAutomaticMosaic( 1 )
      }
    } ).done( function ( data ) { updateStatus( task, '#exportStatus' )} )
  }
  
  function downloadTimeseries() {
    var dataSets = []
    $( '#timeseriesDataSets' ).find( 'input:checked' ).each( function () {
      dataSets.push( $( this ).attr( 'id' ) )
    } )
    var task = guid()
    postJson( 'submit', {
      task  : task,
      module: 'sepal.timeseries.download',
      spec  : {
        description: $( '#timeseriesName' ).val(),
        expression : $( '#expression' ).val(),
        dataSets   : dataSets,
        aoi        : createAoi(),
        fromDate   : isoDate( fromDatePicker.getDate() ),
        toDate     : isoDate( toDatePicker.getDate() ),
        maskSnow   : Boolean( $( 'input[name="mask-snow"]:checked' ).val() ),
        brdfCorrect: Boolean( $( 'input[name="brdf-correct"]:checked' ).val() )
      }
    } ).done( function ( data ) { updateStatus( task, '#timeseriesStatus' )} )
  }
  
  function createAoi() {
    if ( shape !== null )
      return {
        type: 'polygon',
        path: createPolygon()
      }
    else {
      var iso = $( '#countries' ).val()
      if ( iso )
        return {
          type     : 'fusionTable',
          tableName: '15_cKgOA-AkdD6EiO-QW9JXM8_1-dPuuj1dqFr17F',
          keyColumn: 'ISO',
          keyValue : iso
        }
      else {
        var fusionTable = $( '#fusionTable' ).val()
        return {
          type     : 'fusionTableCollection',
          tableName: fusionTable
        }
      }
    }
  }
  
  function createMosaic( mapIndex ) {
    var dataSet               = $( 'input[name=dataSet]:checked' ).val()
    var surfaceReflectance    = $( 'input[name="surface-reflectance"]:checked' ).val()
    var bands                 = $( '#bands' + mapIndex ).val().split( ', ' )
    var targetDayOfYear       = $( '#target-day-of-year' ).val()
    var targetDayOfYearWeight = $( '#target-day-of-year-weight' ).val()
    var shadowTolerance       = $( '#shadow-tolerance' ).val()
    var hazeTolerance         = $( '#haze-tolerance' ).val()
    var greennessWeight       = $( '#greenness-weight' ).val()
    var medianComposite       = $( 'input[name="median-composite"]:checked' ).val()
    var brdfCorrect           = $( 'input[name="brdf-correct"]:checked' ).val()
    var maskClouds            = $( 'input[name="mask-clouds"]:checked' ).val()
    var maskSnow              = $( 'input[name="mask-snow"]:checked' ).val()
    
    return {
      aoi                  : createAoi(),
      targetDayOfYear      : targetDayOfYear,
      targetDayOfYearWeight: targetDayOfYearWeight,
      shadowTolerance      : shadowTolerance,
      hazeTolerance        : hazeTolerance,
      greennessWeight      : greennessWeight,
      dataSet              : dataSet,
      surfaceReflectance   : surfaceReflectance,
      bands                : bands,
      medianComposite      : medianComposite,
      brdfCorrect          : brdfCorrect,
      maskClouds           : maskClouds,
      maskSnow             : maskSnow
      
    }
  }
  
  function createManualMosaic( mapIndex ) {
    var mosaic      = createMosaic( mapIndex )
    mosaic.sceneIds = $( '#sceneIds' ).val().trim().split( '\n' )
    mosaic.type     = 'manual'
    return mosaic
  }
  
  function previewManualMosaic( mapIndex ) {
    postJson( 'preview', createManualMosaic( mapIndex ) )
      .done( function ( data ) {
        renderMap( data.mapId, data.token, mapIndex )
      } )
  }
  
  function renderMap( mapId, token, mapIndex ) {
    var eeMapOptions = {
      getTileUrl: function ( tile, zoom ) {
        var baseUrl = 'https://earthengine.googleapis.com/map'
        var url     = [ baseUrl, mapId, zoom, tile.x, tile.y ].join( '/' )
        url += '?token=' + token
        return url
      },
      tileSize  : new google.maps.Size( 256, 256 )
    }
    
    // Create the map type.
    var map     = maps[ mapIndex - 1 ]
    var mapType = new google.maps.ImageMapType( eeMapOptions )
    map.overlayMapTypes.clear()
    map.overlayMapTypes.push( mapType )
  }
  
  function createDatePicker( field, date ) {
    var datePicker = new Pikaday( {
      field      : field,
      defaultDate: date
    } )
    datePicker.setDate( date )
    return datePicker
  }
  
  function dayOfYear() {
    var now    = new Date();
    var start  = new Date( now.getFullYear(), 0, 0 );
    var diff   = now - start;
    var oneDay = 1000 * 60 * 60 * 24;
    return Math.floor( diff / oneDay );
  }
  
  function guid() {
    function s4() {
      return Math.floor( (1 + Math.random()) * 0x10000 ).toString( 16 ).substring( 1 )
    }
    
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4()
  }
  
  function postJson( url, data ) {
    return $.ajax( {
      type       : 'POST',
      url        : url,
      data       : JSON.stringify( data ),
      contentType: "application/json; charset=utf-8",
      dataType   : "json"
    } )
  }
  
  function isoDate( date ) {
    var month = '' + (date.getMonth() + 1),
        day   = '' + date.getDate(),
        year  = date.getFullYear();
    
    if ( month.length < 2 ) month = '0' + month;
    if ( day.length < 2 ) day = '0' + day;
    
    return [ year, month, day ].join( '-' );
  }
  
  function updateStatus( task, elementId ) {
    setTimeout( function () {
      $.getJSON( 'status', { task: task } )
        .done( function ( status ) {
          $( elementId ).html( status.message )
          state = status.state
          if ( state !== 'RESOLVED' && state !== 'REJECTED' && state !== 'CANCELED' ) {
            updateStatus( task, elementId )
          } else {
          
          }
        } )
        .fail( function ( error ) {
          console.log( 'Failed to update status', error )
        } )
    }, 1000 )
  }
})()

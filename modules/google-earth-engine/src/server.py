import argparse
import atexit
import json
import logging

import ee
from ee import EEException
from flask import Flask, Blueprint, Response, request

from sepalinternal import gee
from sepalinternal import image_spec_factory
from sepalinternal.aoi import Aoi
from sepalinternal.drive.drive_cleanup import DriveCleanup
from sepalinternal.sepal_api import SepalApi
from sepalinternal.sepal_exception import SepalException
from sepalinternal import table

app = Flask(__name__)
http = Blueprint(__name__, __name__)
drive_cleanup = None

sepal_api = None


@http.before_request
def before():
    gee.init_ee()


@http.route('/healthcheck', methods=['GET'])
def healthcheck():
    try:
        ee.Feature(ee.Geometry.Point(0, 0)).getMapId()
    except Exception:
        logging.info('User not whitelisted. user: ' + str(request.headers.get('sepal-user', '[No sepal-user header]')))
        return 'NOT-WHITELISTED', 400
    return Response(json.dumps({'status': 'OK'}), mimetype='application/json')


@http.route('/preview', methods=['POST'])
def preview():
    image_spec = image_spec_factory.create(sepal_api, request.get_json())
    image_preview = image_spec.preview()
    return Response(json.dumps(image_preview), mimetype='application/json')


@http.route('/bands', methods=['POST'])
def bands():
    image_spec = image_spec_factory.create(sepal_api, request.get_json())
    bands = image_spec._ee_image().bandNames().getInfo()
    return Response(json.dumps(bands), mimetype='application/json')


@http.route('/recipe/geometry', methods=['POST'])
def recipe_geometry():
    image_spec = image_spec_factory.create(sepal_api, request.get_json())
    geometry = image_spec.geometry()
    return Response(json.dumps(geometry), mimetype='application/json')


@http.route('/sceneareas')
def scene_areas():
    aoi = Aoi.create(json.loads(request.values['aoi']))
    areas = aoi.scene_areas(request.values['source'])
    return Response(json.dumps(areas), mimetype='application/json')



@http.route('/table/columns')
def columns():
    table_id = request.values['tableId']
    columns = table.columns(table_id)
    return Response(json.dumps(columns), mimetype='application/json')

@http.route('/table/columnValues')
def column_values():
    table_id = request.values['tableId']
    column_name = request.values['columnName']
    values = table.column_values(table_id, column_name)
    return Response(json.dumps(values), mimetype='application/json')

@http.route('/table/map')
def table_map():
    table_id = request.values['tableId']
    column_name = request.values['columnName']
    column_value = request.values['columnValue']
    color = request.values.get('color', '#272723')
    ee_map = table.ee_map(table_id, column_name, column_value, color)
    return Response(json.dumps(ee_map), mimetype='application/json')

@http.route('/table/query', methods=['POST'])
def table_query():
    query = request.get_json()
    select = query['select']
    from_table = query['from']
    where = query['where']
    order_by = query['orderBy']
    results = table.query(select, from_table, where, order_by)
    return Response(json.dumps(results), mimetype='application/json')


@http.errorhandler(SepalException)
def sepal_exception(error):
    # logging.exception('Got SepalException')
    body = {
        'code': error.code,
        'data': error.data,
        'message': str(error),
        'cause': str(error.cause)
    }
    return Response(json.dumps(body), mimetype='application/json', status=400)


@http.errorhandler(EEException)
def ee_exception(error):
    logging.exception('Got EEException')
    body = {
        'code': 'gee.error.earthEngineException',
        'data': {'earthEngineMessage': str(error)},
        'message': str(error)
    }
    return Response(json.dumps(body), mimetype='application/json', status=400)


def init(server_args):
    global sepal_api, drive_cleanup
    gee.init_service_account_credentials(server_args)
    sepal_api = SepalApi(
        host=server_args['sepal_host'],
        username=server_args['sepal_username'],
        password=server_args['sepal_password']
    )

    drive_cleanup = DriveCleanup(gee.service_account_credentials)
    drive_cleanup.start()


def destroy():
    logging.info('*** Stopping gee server ***')
    if drive_cleanup:
        drive_cleanup.stop()


def build_app(server_args):
    logging.basicConfig(level=logging.INFO)
    init(server_args)
    app.register_blueprint(http)
    atexit.register(destroy)
    return app


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--gee-email', required=True, help='Earth Engine service account email')
    parser.add_argument('--gee-key-path', required=True, help='Path to Earth Engine service account key')
    parser.add_argument('--sepal-host', required=True, help='Sepal server host, e.g. sepal.io')
    parser.add_argument('--sepal-username', required=True, help='Username to use when accessing sepal services')
    parser.add_argument('--sepal-password', required=True, help='Password to use when accessing sepal services')
    args, unknown = parser.parse_known_args()
    build_app(vars(args))
    app.run(host='0.0.0.0', threaded=True, port=5001)

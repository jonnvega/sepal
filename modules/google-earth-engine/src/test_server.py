from __future__ import print_function

import argparse
import logging

import ee
from flask import Flask, render_template

import server
import task_server
from sepalinternal import gee

modules = [server, task_server]
app = Flask(__name__)


# @app.before_request
# def before():
#     gee.init_ee()


@app.route('/')
def index():
    countries = ee.FeatureCollection('ft:15_cKgOA-AkdD6EiO-QW9JXM8_1-dPuuj1dqFr17F') \
        .filterMetadata('NAME_FAO', 'not_equals', '')
    isos = countries.sort('NAME_FAO').aggregate_array('ISO').getInfo()
    names = countries.sort('NAME_FAO').aggregate_array('NAME_FAO').getInfo()
    countries = zip(isos, names)
    return render_template('index.html', countries=countries)


def init(args):
    print('Init running')
    for module in modules:
        app.register_blueprint(module.http)
        module.init(args)


def destroy():
    for module in modules:
        module.destroy()


if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG)
    parser = argparse.ArgumentParser()
    parser.add_argument('--gee-email', required=True, help='Earth Engine service account email')
    parser.add_argument('--gee-key-path', required=True, help='Path to Earth Engine service account key')
    parser.add_argument('--sepal-host', required=True, help='Sepal server host, e.g. sepal.io')
    parser.add_argument('--sepal-username', required=True, help='Username to use when accessing sepal services')
    parser.add_argument('--sepal-password', required=True, help='Password to use when accessing sepal services')
    parser.add_argument('--username', required=True, help='Username of user executing tasks')
    parser.add_argument('--home-dir', required=True, help='User home directory.')
    args, unknown = parser.parse_known_args()
    init(vars(args))
    logging.getLogger("werkzeug").setLevel(logging.ERROR)
    logging.getLogger("googleapiclient.discovery").setLevel(logging.ERROR)
    logging.getLogger("googleapiclient.discovery_cache").setLevel(logging.ERROR)
    app.run(threaded=True, port=5001)

destroy()

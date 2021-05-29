#!/usr/bin/env python
# -*- coding: utf-8 -*-

from setuptools import setup, find_packages

from wwm import VERSION_STRING

setup(
    include_package_data=True,
    name='wwm',
    version=VERSION_STRING,
    author='Florian Scherf',
    url='https://github.com/fscherf/wwm',
    author_email='f.scherf@pengutronix.de',
    license='MIT',
    packages=find_packages(),
    install_requires=[
        'lona',
    ],
    scripts=[],
)

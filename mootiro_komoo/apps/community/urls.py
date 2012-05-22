#!/usr/bin/env python
# -*- coding: utf-8 -*-
from __future__ import unicode_literals  # unicode by default
from django.conf.urls.defaults import *

from mootiro_komoo.urls import prepare_regex as pr

home_urls = [r'^COMMUNITY_SLUG/']

urlpatterns = patterns('community.views',
    url(r'^community/new$', 'new_community', name='new_community'),
    url(r'^community/edit$', 'edit_community', name='edit_community'),

    url(r'^communities$', 'list', name='list_communities'),

    url(r'^community/search_by_name$', 'search_by_name',
        name='search_community_by_name'),
    url(r'^community/search_by_tag/$', 'search_by_tag',
            name='community_search_by_tag'),
    url(r'^community/get_geojson$', 'communities_geojson',
        name='communities_geojson'),
    url(r'^community/get_name_for/(?P<id>\d+)/$', 'get_name_for',
        name='get_name_for'),

    url(r'^community/autocomplete_get_or_add/$', 'autocomplete_get_or_add',
        name='autocomplete_get_or_add'),

    url(pr(r'^COMMUNITY_SLUG/edit/?$'), 'edit_community', name='edit_community'),

    url(pr(r'^COMMUNITY_SLUG/about/?$'), 'view', name='view_community'),

    url(pr(r'^COMMUNITY_SLUG/?$'), 'on_map', name='community_on_map'),
)

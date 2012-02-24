#!/usr/bin/env python
# -*- coding: utf-8 -*-
from __future__ import unicode_literals  # unicode by default
from itertools import chain

from django import forms
from django.forms.widgets import flatatt
from django.utils.html import escape, conditional_escape
from django.utils.encoding import force_unicode
from django.utils.safestring import mark_safe
from django.template.defaultfilters import slugify

from annoying.functions import get_config


class Autocomplete(forms.TextInput):
    """Widget that uses a JQuery autocomplete facade to fill a hidden field.
    Usually to be used on ForeignKey fields.
        label_id: html id of the visible autocomplete field
        value_id: html id of the hidden field that contains data to be persisted
    """
    def __init__(self, source_url, *a, **kw):
        self.source_url = source_url
        super(Autocomplete, self).__init__(*a, **kw)

    def render_js(self, label_id, value_id):
        js = u"""
        $("#%(label_id)s").autocomplete({
            source: "%(source_url)s",
            focus: function(event, ui) {
                $("#%(label_id)s").val(ui.item.label);
                return false;
            },
            select: function(event, ui) {
                $("#%(label_id)s").val(ui.item.label);
                $("#%(value_id)s").val(ui.item.value);
                return false;
            }
        });
        """ % {
            'source_url': self.source_url,
            'label_id': label_id,
            'value_id': value_id
        }
        return js

    def render(self, name, value=None, attrs=None):
        value_id = 'id_%s' % name  # id_fieldname
        label_id = '%s_autocomplete' % value_id  # id_fieldname_autocomplete

        value_attrs = dict(id=value_id, name=name, value=value)

        # attrs is consumed by the label field (autocomplete)
        label_attrs = self.build_attrs(attrs)  # must not have 'name' attribute
        if value:
            # TODO: get label for initial bounded value. How?
            label_attrs['value'] = escape(unicode(value))
        if not 'id' in self.attrs:
            label_attrs['id'] = label_id

        html = u'''
        <input type="text" %(value_attrs)s />
        <input type="text" %(label_attrs)s />
        <script type="text/javascript"><!--//
          %(js)s
        //--></script>
        ''' % {
            'value_attrs': flatatt(value_attrs),
            'label_attrs': flatatt(label_attrs),
            'js': self.render_js(label_id, value_id),
        }
        return html


class MultipleAutocompleteBase(forms.TextInput):
    """Widget that uses the JQuery Tags Input Plugin by xoxco.com. It can be
    used as an friendly interface for many to many relationship fields, as it
    has an ajax autocomplete functionality. See http://xoxco.com/projects/code/tagsinput/.
    """

    class Media:
        css = {'all': ('lib/tagsinput/jquery.tagsinput.css',)}
        js = ('lib/tagsinput/jquery.tagsinput.min.js',)

    def __init__(self, autocomplete_url="", options={}, attrs={}):
        """Arguments are:
            autocomplete_url: url that accepts a 'term' GET variable and returns
                a json list containing names that matches the given term.
            converter: a function that will used to convert each string in the
                comma-separated string given by the user. The output type must
                fit the containing Field requirements.
        """
        self.autocomplete_url = autocomplete_url
        self.options = options
        self.attrs = attrs

    def value_from_datadict(self, data, files, name):
        s = data.get(name, '')  # comma separated string
        l = [self.widget_to_field(v) for v in s.split(',')] if s else None
        return l

    def render_js(self, elem_id):
        if self.autocomplete_url:
            options_str = "{autocomplete_url: '%s'}" % self.autocomplete_url
        else:
            options_str = ""

        js = u"""
        $('#%(elem_id)s').tagsInput(%(options)s);
        """ % {
            'elem_id': elem_id,
            'options': options_str,
        }
        return js

    def render(self, name, value=None, attrs=None):
        final_attrs = self.build_attrs(attrs, name=name)

        if not 'id' in self.attrs:
            final_attrs['id'] = 'id_%s' % name
        if value:
            strings = [self.field_to_widget(v) for v in value]
            final_attrs['value'] = ", ".join([escape(s) for s in strings])

        html = u"""
        <input %(attrs)s"/>
        <script type="text/javascript"><!--//
          %(js)s
        //--></script>
        """ % {
            'name': name,
            'attrs': flatatt(final_attrs),
            'js': self.render_js(final_attrs['id'])
        }
        return html


class Tagsinput(MultipleAutocompleteBase):
    """Assumes attribute 'name' to the tag Model"""

    def __init__(self, model, *a, **kw):
        self.model = model
        super(Tagsinput, self).__init__(*a, **kw)

    def widget_to_field(self, tag_name):
        instance, created = self.model.objects.get_or_create(name=tag_name)
        return instance

    def field_to_widget(self, tag_id):
        instance = self.model.objects.get(id=tag_id)
        return unicode(instance.name)


class TaggitWidget(MultipleAutocompleteBase):
    """Follows django-taggit api"""

    def widget_to_field(self, tag_name):
        return tag_name

    def field_to_widget(self, instance):
        return unicode(instance.tag)


class ImageSwitch(forms.CheckboxInput):

    class Media:
        js = ('lib/jquery.imagetick.min.js',)

    def __init__(self, image_tick, image_no_tick, attrs=None, *a, **kw):
        super(ImageSwitch, self).__init__(attrs, *a, **kw)
        self.image_tick = get_config("STATIC_URL", "") + image_tick
        self.image_no_tick = get_config("STATIC_URL", "") + image_no_tick

    def render_js(self, checkbox_id):
        js = u"""
        $("#%(checkbox_id)s").imageTick({
            tick_image_path: "%(image_tick)s",
            no_tick_image_path: "%(image_no_tick)s"
        });
        """ % {
            'checkbox_id': checkbox_id,
            'image_tick': self.image_tick,
            'image_no_tick': self.image_no_tick,
        }
        return js

    def render(self, name, value, **attrs):
        final_attrs = self.build_attrs(attrs, name=name)

        if not 'id' in self.attrs:
            final_attrs['id'] = 'id_%s' % name

        html = u"""
        %(checkbox)s
        <script type="text/javascript"><!--//
          %(js)s
        //--></script>
        """ % {
            'checkbox': super(ImageSwitch, self).render(name, value, final_attrs),
            'js': self.render_js(final_attrs['id'])
        }
        return html


class ImageSwitchMultiple(forms.CheckboxSelectMultiple):

    class Media:
        js = ('lib/jquery.imagetick.min.js',)

    def render(self, name, value, attrs=None, choices=()):
        if value is None:
            value = []
        has_id = attrs and 'id' in attrs
        final_attrs = self.build_attrs(attrs, name=name)
        output = [u'<ul>']
        # Normalize to strings
        str_values = set([force_unicode(v) for v in value])
        for i, (option_value, option_label) in enumerate(chain(self.choices, choices)):
            # If an ID attribute was given, add a numeric index as a suffix,
            # so that the checkboxes don't all have the same ID attribute.
            if has_id:
                final_attrs = dict(final_attrs, id='%s_%s' % (attrs['id'], i))

            image_tick = "%s-tick.png" % slugify(option_label)
            image_no_tick = "%s-no-tick.png" % slugify(option_label)
            cb = ImageSwitch(image_tick, image_no_tick, attrs=final_attrs,
                    check_test=lambda value: value in str_values)
            option_value = force_unicode(option_value)
            rendered_cb = cb.render(name, option_value)
            option_label = conditional_escape(force_unicode(option_label))
            output.append(u'<li title="%s">%s</li>' % (option_label, rendered_cb))
        output.append(u'</ul>')
        return mark_safe(u'\n'.join(output))

# -*- coding: utf-8 -*-
# Generated by Django 1.11.5 on 2017-09-10 22:23
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0007_storeitem_is_ticket'),
    ]

    operations = [
        migrations.CreateModel(
            name='Receipt',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('subject', models.CharField(max_length=256, verbose_name='Aihe')),
                ('mail_to', models.CharField(max_length=256, verbose_name='Vastaanottajan osoite')),
                ('mail_from', models.CharField(max_length=256, verbose_name='Lähettäjän osoite')),
                ('sent', models.DateTimeField(default=None, null=True, verbose_name='Lähetysaika')),
                ('params', models.TextField(default=None, null=True, verbose_name='Lähetysparametrit')),
                ('content', models.TextField(default=None, null=True, verbose_name='Kuitin sisältö')),
            ],
            options={
                'verbose_name': 'kuitti',
                'verbose_name_plural': 'kuitit',
            },
        ),
    ]